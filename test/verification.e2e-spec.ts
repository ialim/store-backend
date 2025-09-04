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
    // ensure a clean slate
    await prisma.customerProfile.deleteMany();
    await prisma.user.deleteMany();
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
            email: "test@example.com",
            password: "secret"
          }) {
            accessToken
            user { id email }
          }
        }
      `,
      });
    expect(res.body.data.signupCustomer.user.email).toBe('test@example.com');

    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });
    expect(user?.isEmailVerified).toBe(false);
    expect(user?.emailVerificationToken).toBeDefined();
    expect(user?.emailVerificationTokenExpiry).toBeInstanceOf(Date);
  });

  it('2️⃣ verifies the email token', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
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
    expect(res.body.data.verifyEmail).toBe(true);

    const updated = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });
    expect(updated?.isEmailVerified).toBe(true);
    expect(updated?.emailVerificationToken).toBeNull();
  });

  it('3️⃣ logs in and sends a phone verification code', async () => {
    // first complete CustomerProfile so phone exists
    await prisma.customerProfile.update({
      where: {
        userId: (
          await prisma.user.findUnique({ where: { email: 'test@example.com' } })
        )?.id,
      },
      data: { phone: '08012345678' },
    });

    const login = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          login(input:{ email:"test@example.com", password:"secret" }) {
            accessToken
          }
        }
      `,
      });
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
    expect(phoneRes.body.data.sendPhoneVerification).toBe(true);

    const profile = await prisma.customerProfile.findUnique({
      where: {
        userId: (
          await prisma.user.findUnique({ where: { email: 'test@example.com' } })
        )?.id,
      },
    });
    expect(profile?.phoneVerificationCode).toHaveLength(6);
    expect(profile?.phoneVerificationCodeExpiry).toBeInstanceOf(Date);
  });

  it('4️⃣ verifies the phone code', async () => {
    // reuse token from login
    const login = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
        mutation {
          login(input:{ email:"test@example.com", password:"secret" }) {
            accessToken
          }
        }
      `,
      });
    const token = login.body.data.login.accessToken;

    const profile = await prisma.customerProfile.findUnique({
      where: {
        userId: (
          await prisma.user.findUnique({ where: { email: 'test@example.com' } })
        )?.id,
      },
    });
    const code = profile?.phoneVerificationCode;

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
    expect(verifyRes.body.data.verifyPhone).toBe(true);

    const updated = await prisma.customerProfile.findUnique({
      where: { userId: profile?.userId },
    });
    expect(updated?.isPhoneVerified).toBe(true);
  });
});
