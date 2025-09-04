import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStaffInput } from './dto/create-staff.input';
import { AssignStoreManagerInput } from './dto/assign-store-manager.input';
import { AssignBillerInput } from './dto/assign-biller.input';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class StaffService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async createStaff(data: CreateStaffInput) {
    const role = await this.prisma.role.findUnique({
      where: { name: data.role },
    });
    if (!role) throw new NotFoundException(`Role ${data.role} not found`);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.password,
        roleId: role.id,
      },
    });

    await this.notificationService.createNotification(
      user.id,
      'STAFF_CREATED',
      `Your account as ${data.role} has been created.`,
    );

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
