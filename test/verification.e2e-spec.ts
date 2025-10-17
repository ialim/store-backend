import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { EmailService } from '../src/modules/verification/services/email.service';
import { SmsService } from '../src/modules/verification/services/sms.service';

describe('Verification (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const unique = Date.now().toString(36);
  const email = `test+${unique}@example.com`;
  const password = 'secret';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // stub out external integrations
      .overrideProvider(EmailService)
      .useValue({ sendMail: jest.fn() })
      .overrideProvider(SmsService)
      .useValue({ sendSms: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.role.upsert({
      where: { name: 'CUSTOMER' },
      update: {},
      create: { name: 'CUSTOMER' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1️⃣ signs up a customer and issues an email token', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          signupCustomer(input: {
            email: "${email}",
            password: "${password}"
          }) {
            accessToken
            user { id email }
          }
        }
      `,
      });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.signupCustomer.user.email).toBe(email);

    const user = await prisma.user.findUnique({
      where: { email },
    });
    expect(user?.isEmailVerified).toBe(false);
    expect(user?.emailVerificationToken).toBeDefined();
    expect(user?.emailVerificationTokenExpiry).toBeInstanceOf(Date);
  });

  it('2️⃣ verifies the email token', async () => {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          verifyEmail(token: "${user?.emailVerificationToken}")
        }
      `,
      });
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.verifyEmail).toBe(true);

    const updated = await prisma.user.findUnique({
      where: { email },
    });
    expect(updated?.isEmailVerified).toBe(true);
    expect(updated?.emailVerificationToken).toBeNull();
  });

  it('3️⃣ logs in and sends a phone verification code', async () => {
    // first complete CustomerProfile so phone exists
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeDefined();
    await prisma.customerProfile.update({
      where: {
        userId: user!.id,
      },
      data: { phone: '08012345678' },
    });

    const login = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          login(input:{ email:"${email}", password:"${password}" }) {
            accessToken
          }
        }
      `,
      });
    expect(login.body.errors).toBeUndefined();
    const token = login.body.data.login.accessToken;
    expect(token).toBeDefined();

    const phoneRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
        mutation {
          sendPhoneVerification
        }
      `,
      });
    expect(phoneRes.body.errors).toBeUndefined();
    expect(phoneRes.body.data.sendPhoneVerification).toBe(true);

    const profile = await prisma.customerProfile.findUnique({
      where: {
        userId: user!.id,
      },
    });
    expect(profile).toBeDefined();
    expect(profile?.phoneVerificationCode).toHaveLength(6);
    expect(profile?.phoneVerificationCodeExpiry).toBeInstanceOf(Date);
  });

  it('4️⃣ verifies the phone code', async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeDefined();
    // reuse token from login
    const login = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          login(input:{ email:"${email}", password:"${password}" }) {
            accessToken
          }
        }
      `,
      });
    expect(login.body.errors).toBeUndefined();
    const token = login.body.data.login.accessToken;

    const profile = await prisma.customerProfile.findUnique({
      where: {
        userId: user!.id,
      },
    });
    expect(profile).toBeDefined();
    const code = profile?.phoneVerificationCode;
    expect(code).toBeDefined();

    const verifyRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `
        mutation {
          verifyPhone(code:"${code}")
        }
      `,
      });
    expect(verifyRes.body.errors).toBeUndefined();
    expect(verifyRes.body.data.verifyPhone).toBe(true);

    const updated = await prisma.customerProfile.findUnique({
      where: { userId: profile?.userId },
    });
    expect(updated?.isPhoneVerified).toBe(true);
  });
});
