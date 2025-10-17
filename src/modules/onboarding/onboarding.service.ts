import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ProfileStatus as PrismaProfileStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcrypt';
import { CreateUserInput } from '../users/dto/create-user.input';
import { AuthResponse } from '../auth/dto/auth-response.output';
import { UpdateCustomerProfileInput } from './dto/update-customer-profile.input';
import { ApplyResellerInput } from './dto/apply-reseller.input';
import { ApproveResellerInput } from './dto/approve-reseller.input';
import { NotificationService } from '../notification/notification.service';
import { VerificationService } from '../verification/verification.service';
import { AdminUpdateCustomerProfileInput } from './dto/admin-update-customer-profile.input';
import { AdminCreateCustomerInput } from './dto/admin-create-customer.input';

const bcryptHash = hashSync as (data: string, saltOrRounds: number) => string;

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationService: NotificationService,
    private verificationService: VerificationService,
  ) {}

  private static hashPassword(password: string): string {
    return bcryptHash(password, 10);
  }

  private static resolveProfileStatus(
    status?: 'PENDING' | 'ACTIVE' | 'REJECTED' | null,
  ): PrismaProfileStatus | undefined {
    if (!status) return undefined;
    return PrismaProfileStatus[status];
  }

  async signupCustomer(input: CreateUserInput): Promise<AuthResponse> {
    const customerRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });
    if (!customerRole) throw new NotFoundException('Customer role not found');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: OnboardingService.hashPassword(input.password),
        roleId: customerRole.id,
        customerProfile: {
          create: {
            fullName: '',
            email: input.email,
            profileStatus: PrismaProfileStatus.PENDING,
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

    try {
      await this.verificationService.sendEmailVerification(user.id);
    } catch (error) {
      this.logger.warn(
        `Failed to queue verification email for customer signup ${user.id}: ${error}`,
      );
    }

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
        passwordHash: OnboardingService.hashPassword(input.password),
        roleId: resellerRole.id,
        resellerProfile: {
          create: {
            // biller assigned later on approval; capture requestedBillerId if provided
            requestedBillerId: input.requestedBillerId ?? null,
            tier: input.tier,
            creditLimit: input.creditLimit,
            profileStatus: PrismaProfileStatus.PENDING,
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

    try {
      await this.verificationService.sendEmailVerification(user.id);
    } catch (error) {
      this.logger.warn(
        `Failed to queue verification email for reseller ${user.id}: ${error}`,
      );
    }

    return user.resellerProfile;
  }

  async approveReseller(resellerId: string, input: ApproveResellerInput) {
    const data: Prisma.ResellerProfileUpdateInput = {
      tier: input.tier,
      creditLimit: input.creditLimit,
      profileStatus: PrismaProfileStatus.ACTIVE,
      activatedAt: new Date(),
    };
    if (input.billerId) {
      (data as Prisma.ResellerProfileUncheckedUpdateInput).billerId =
        input.billerId;
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

  async listPendingResellerApplications(
    take?: number,
    skip?: number,
    q?: string,
  ) {
    const where: Prisma.ResellerProfileWhereInput = {
      profileStatus: PrismaProfileStatus.PENDING,
    };
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
      where: { role: { is: { name: 'BILLER' } } },
      select: {
        id: true,
        email: true,
        customerProfile: { select: { fullName: true } },
      },
      orderBy: { email: 'asc' },
      take: 200,
    });
  }

  async activateReseller(resellerId: string, billerId?: string) {
    const data: Prisma.ResellerProfileUpdateInput = {
      profileStatus: PrismaProfileStatus.ACTIVE,
      isActive: true,
      activatedAt: new Date(),
      // clear prior rejection data if any
      rejectedAt: null,
      rejectionReason: null,
    };
    if (billerId)
      (data as Prisma.ResellerProfileUncheckedUpdateInput).billerId = billerId;
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
        profileStatus: PrismaProfileStatus.REJECTED,
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

  async adminUpdateCustomerProfile(
    userId: string,
    input: AdminUpdateCustomerProfileInput,
  ) {
    const update: Prisma.CustomerProfileUncheckedUpdateInput = {
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      gender: input.gender,
      birthday: input.birthday,
      preferredStoreId: input.preferredStoreId,
    };
    const updatedStatus = OnboardingService.resolveProfileStatus(
      input.profileStatus,
    );
    if (updatedStatus) {
      update.profileStatus = updatedStatus;
      if (updatedStatus === PrismaProfileStatus.ACTIVE)
        update.activatedAt = new Date();
    }
    const profile = await this.prisma.customerProfile.update({
      where: { userId },
      data: update,
      include: { preferredStore: true, user: true },
    });
    return profile;
  }

  async adminCreateCustomer(input: AdminCreateCustomerInput) {
    const role = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });
    if (!role) throw new NotFoundException('Customer role not found');
    const resolvedStatus =
      OnboardingService.resolveProfileStatus(input.profileStatus) ??
      PrismaProfileStatus.ACTIVE;
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: OnboardingService.hashPassword(input.password),
        roleId: role.id,
        customerProfile: {
          create: {
            fullName: input.fullName || '',
            phone: input.phone || null,
            email: input.email,
            preferredStoreId: input.preferredStoreId || null,
            profileStatus: resolvedStatus,
            activatedAt:
              resolvedStatus === PrismaProfileStatus.ACTIVE ? new Date() : null,
          },
        },
      },
      include: { customerProfile: { include: { preferredStore: true } } },
    });
    try {
      await this.notificationService.createNotification(
        user.id,
        'CUSTOMER_CREATED',
        'Your account has been created by an admin.',
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send admin-created notification for user ${user.id}: ${error}`,
      );
    }

    try {
      await this.verificationService.sendEmailVerification(user.id);
    } catch (error) {
      this.logger.warn(
        `Failed to queue verification email for admin-created customer ${user.id}: ${error}`,
      );
    }
    return user;
  }

  async listResellers({
    status,
    take,
    skip,
    q,
    billerId,
  }: {
    status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
    take?: number;
    skip?: number;
    q?: string;
    billerId?: string | null;
  } = {}) {
    const where: Prisma.ResellerProfileWhereInput = {};
    if (status) where.profileStatus = PrismaProfileStatus[status];
    if (q) {
      where.user = {
        email: { contains: q, mode: 'insensitive' },
      };
    }
    if (billerId) {
      where.billerId = billerId;
    }
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

  async updateMyProfile(userId: string, input: UpdateCustomerProfileInput) {
    const profileData: Prisma.CustomerProfileUncheckedCreateInput = {
      fullName: input.fullName,
      phone: input.phone || null,
      email: input.email || null,
      gender: input.gender || null,
      birthday: input.birthday || null,
      preferredStoreId: input.preferredStoreId || null,
      userId,
    };

    if (input.email) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { email: input.email },
      });
    }

    const existing = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      const updated = await this.prisma.customerProfile.update({
        where: { userId },
        data: {
          fullName: profileData.fullName,
          phone: profileData.phone,
          email: profileData.email,
          gender: profileData.gender,
          birthday: profileData.birthday,
          preferredStoreId: profileData.preferredStoreId,
        },
        include: { preferredStore: true },
      });
      return updated;
    }

    const created = await this.prisma.customerProfile.create({
      data: profileData,
      include: { preferredStore: true },
    });
    return created;
  }
}
