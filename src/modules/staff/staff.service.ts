import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { hashSync } from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStaffInput } from './dto/create-staff.input';
import { AssignStoreManagerInput } from './dto/assign-store-manager.input';
import { AssignBillerInput } from './dto/assign-biller.input';
import { NotificationService } from '../notification/notification.service';
import { VerificationService } from '../verification/verification.service';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private verificationService: VerificationService,
  ) {}

  async createStaff(data: CreateStaffInput) {
    const role = await this.prisma.role.findUnique({
      where: { id: data.roleId },
    });
    if (!role) throw new NotFoundException(`Role not found`);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashSync(data.password, 10),
        roleId: role.id,
      },
    });

    await this.notificationService.createNotification(
      user.id,
      'STAFF_CREATED',
      `Your account as ${role.name} has been created.`,
    );

    try {
      await this.verificationService.sendEmailVerification(user.id);
    } catch (error) {
      // Staff accounts are typically provisioned by admins; log and continue.
      this.logger.warn(
        `Failed to queue verification email for staff user ${user.id}: ${error}`,
      );
    }

    return user;
  }

  async assignStoreManager(data: AssignStoreManagerInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) throw new NotFoundException('User not found');
    const store = await this.prisma.store.update({
      where: { id: data.storeId },
      data: { managerId: data.userId },
    });

    await this.notificationService.createNotification(
      data.userId,
      'STORE_MANAGER_ASSIGNED',
      `You have been assigned as manager for store ${data.storeId}.`,
    );

    return store;
  }

  async assignBiller(data: AssignBillerInput) {
    const profile = await this.prisma.resellerProfile.findUnique({
      where: { userId: data.resellerId },
    });
    if (!profile) throw new NotFoundException('Reseller profile not found');
    const reseller = await this.prisma.resellerProfile.update({
      where: { userId: data.resellerId },
      data: { billerId: data.billerId },
    });

    await this.notificationService.createNotification(
      data.resellerId,
      'BILLER_ASSIGNED',
      `Your account manager has been updated.`,
    );

    return reseller;
  }
}
