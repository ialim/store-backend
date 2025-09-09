import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserInput } from '../users/dto/create-user.input';
import { AuthResponse } from '../auth/dto/auth-response.output';
import { UpdateCustomerProfileInput } from './dto/update-customer-profile.input';
import { ApplyResellerInput } from './dto/apply-reseller.input';
import { ApproveResellerInput } from './dto/approve-reseller.input';
import { NotificationService } from '../notification/notification.service';
import { AdminUpdateCustomerProfileInput } from './dto/admin-update-customer-profile.input';
import { AdminCreateCustomerInput } from './dto/admin-create-customer.input';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationService: NotificationService,
  ) {}

  async signupCustomer(input: CreateUserInput): Promise<AuthResponse> {
    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });
    if (!customerRole) throw new NotFoundException('Customer role not found');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: bcrypt.hashSync(input.password, 10), // hash in real use
        roleId: customerRole.id,
        customerProfile: {
          create: {
            fullName: '',
            email: input.email,
            profileStatus: 'PENDING',
          },
        },
      },
      include: { customerProfile: true },
    });

    await this.notificationService.createNotification(
      user.id,
      'CUSTOMER_SIGNUP',
      'Welcome! Please complete your profile to start ordering.',
    );

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
    });
    return { accessToken: token, user };
  }

  async completeCustomerProfile(
    userId: string,
    data: UpdateCustomerProfileInput,
  ) {
    const profile = await this.prisma.customerProfile.update({
      where: { userId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email,
        gender: data.gender,
        birthday: data.birthday,
        preferredStoreId: data.preferredStoreId,
        profileStatus: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    await this.notificationService.createNotification(
      userId,
      'PROFILE_ACTIVATED',
      'Your customer profile is now active!',
    );

    return profile;
  }

  async applyReseller(input: ApplyResellerInput) {
    const resellerRole = await this.prisma.role.findUnique({
      where: { name: 'RESELLER' },
    });
    if (!resellerRole) throw new NotFoundException('Reseller role not found');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: bcrypt.hashSync(input.password, 10),
        roleId: resellerRole.id,
        resellerProfile: {
          create: {
            // biller assigned later on approval; capture requestedBillerId if provided
            requestedBillerId: input.requestedBillerId ?? null,
            tier: input.tier,
            creditLimit: input.creditLimit,
            profileStatus: 'PENDING',
          },
        },
      },
      include: { resellerProfile: true },
    });

    await this.notificationService.createNotification(
      user.id,
      'RESELLER_APPLIED',
      'Your reseller application is pending approval.',
    );

    return user.resellerProfile;
  }

  async approveReseller(resellerId: string, input: ApproveResellerInput) {
    const data: any = {
      tier: input.tier,
      creditLimit: input.creditLimit,
      profileStatus: 'ACTIVE',
      activatedAt: new Date(),
    };
    if (input.billerId) {
      data.billerId = input.billerId;
    }
    const profile = await this.prisma.resellerProfile.update({
      where: { userId: resellerId },
      data,
      include: { biller: true },
    });

    await this.notificationService.createNotification(
      resellerId,
      'RESELLER_APPROVED',
      'Congrats! Your reseller account has been approved.',
    );

    return profile;
  }

  async listPendingResellerApplications(take?: number, skip?: number, q?: string) {
    const where: any = { profileStatus: 'PENDING' as any };
    if (q) {
      where.user = { email: { contains: q, mode: 'insensitive' } };
    }
    return this.prisma.resellerProfile.findMany({
      where,
      include: { user: true, biller: true, requestedBiller: true },
      orderBy: { requestedAt: 'desc' },
      take: take ?? 50,
      skip: skip ?? 0,
    });
  }

  async listBillers() {
    return this.prisma.user.findMany({
      where: { role: { name: 'BILLER' } as any },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
      take: 200,
    });
  }

  async activateReseller(resellerId: string, billerId?: string) {
    const data: any = {
      profileStatus: 'ACTIVE',
      isActive: true,
      activatedAt: new Date(),
      // clear prior rejection data if any
      rejectedAt: null,
      rejectionReason: null,
    };
    if (billerId) data.billerId = billerId;
    const profile = await this.prisma.resellerProfile.update({
      where: { userId: resellerId },
      data,
      include: { biller: true },
    });
    await this.notificationService.createNotification(
      resellerId,
      'RESELLER_APPROVED',
      'Your reseller account is activated.',
    );
    return profile;
  }

  async rejectReseller(resellerId: string, reason?: string) {
    const profile = await this.prisma.resellerProfile.update({
      where: { userId: resellerId },
      data: {
        profileStatus: 'REJECTED' as any,
        isActive: false,
        rejectedAt: new Date(),
        rejectionReason: reason || 'Application rejected',
      },
      include: { user: true },
    });
    await this.notificationService.createNotification(
      resellerId,
      'RESELLER_REJECTED',
      profile.rejectionReason || 'Your reseller application was rejected.',
    );
    return profile;
  }

  async adminUpdateCustomerProfile(userId: string, input: AdminUpdateCustomerProfileInput) {
    const update: any = {
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      gender: input.gender,
      birthday: input.birthday,
      preferredStoreId: input.preferredStoreId,
    };
    if (input.profileStatus) {
      update.profileStatus = input.profileStatus as any;
      if (input.profileStatus === 'ACTIVE') update.activatedAt = new Date();
    }
    const profile = await this.prisma.customerProfile.update({ where: { userId }, data: update, include: { preferredStore: true, user: true } });
    return profile;
  }

  async adminCreateCustomer(input: AdminCreateCustomerInput) {
    const role = await this.prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
    if (!role) throw new NotFoundException('Customer role not found');
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: bcrypt.hashSync(input.password, 10),
        roleId: role.id,
        customerProfile: {
          create: {
            fullName: input.fullName || '',
            phone: input.phone || null,
            email: input.email,
            preferredStoreId: input.preferredStoreId || null,
            profileStatus: (input.profileStatus as any) || 'ACTIVE',
            activatedAt: (input.profileStatus || 'ACTIVE') === 'ACTIVE' ? new Date() : null,
          },
        },
      },
      include: { customerProfile: { include: { preferredStore: true } } },
    });
    try {
      await this.notificationService.createNotification(user.id, 'CUSTOMER_CREATED', 'Your account has been created by an admin.');
    } catch {}
    return user;
  }

  async listResellers(params: {
    status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
    take?: number;
    skip?: number;
    q?: string;
  }) {
    const { status, take, skip, q } = params || {} as any;
    const where: any = {};
    if (status) where.profileStatus = status as any;
    if (q) where.user = { email: { contains: q, mode: 'insensitive' } };
    return this.prisma.resellerProfile.findMany({
      where,
      include: { user: true, biller: true, requestedBiller: true },
      orderBy: [{ profileStatus: 'asc' }, { requestedAt: 'desc' }],
      take: take ?? 50,
      skip: skip ?? 0,
    });
  }

  async getResellerProfile(userId: string) {
    return this.prisma.resellerProfile.findUnique({
      where: { userId },
      include: { user: true, biller: true, requestedBiller: true },
    });
  }
}
