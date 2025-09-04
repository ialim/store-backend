import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { UpdateSupplierInput } from './dto/update-supplier.input';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { UpdatePurchaseOrderStatusInput } from './dto/update-purchase-order-status.input';
import { CreateSupplierPaymentInput } from './dto/create-supplier-payment.input';
import { CreateSupplierInput } from './dto/create-supplier.input';

@Injectable()
export class PurchaseService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // Suppliers
  async suppliers() {
    return this.prisma.supplier.findMany();
  }

  async supplier(id: string) {
    const sup = await this.prisma.supplier.findUnique({ where: { id } });
    if (!sup) throw new NotFoundException('Supplier not found');
    return sup;
  }

  async createSupplier(data: CreateSupplierInput) {
    const sup = await this.prisma.supplier.create({ data });
    await this.notificationService.createNotification(
      sup.id,
      'SUPPLIER_CREATED',
      `Supplier ${sup.name} created`,
    );
    return sup;
  }

  async updateSupplier(data: UpdateSupplierInput) {
    const sup = await this.prisma.supplier.update({
      where: { id: data.id },
      data,
    });
    await this.notificationService.createNotification(
      sup.id,
      'SUPPLIER_UPDATED',
      `Supplier ${sup.name} updated`,
    );
    return sup;
  }

  // Purchase Orders
  async purchaseOrders() {
    return this.prisma.purchaseOrder.findMany({ include: { items: true } });
  }

  async purchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async createPurchaseOrder(data: CreatePurchaseOrderInput) {
    const po = await this.prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        invoiceNumber: data.invoiceNumber,
        status: 'PENDING',
        dueDate: data.dueDate,
        totalAmount: data.totalAmount,
        items: {
          create: data.items.map((i) => ({
            productVariantId: i.productVariantId,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        },
      },
      include: { items: true },
    });
    await this.notificationService.createNotification(
      po.id,
      'PURCHASE_ORDER_CREATED',
      `Purchase Order ${po.invoiceNumber} created`,
    );
    return po;
  }

  async updatePurchaseOrderStatus(data: UpdatePurchaseOrderStatusInput) {
    const po = await this.prisma.purchaseOrder.update({
      where: { id: data.id },
      data: { status: data.status },
    });
    await this.notificationService.createNotification(
      po.id,
      'PURCHASE_ORDER_UPDATED',
      `Purchase Order ${po.invoiceNumber} status updated to ${data.status}`,
    );
    return po;
  }

  // Supplier Payments
  async supplierPayments() {
    return this.prisma.supplierPayment.findMany();
  }

  async createSupplierPayment(data: CreateSupplierPaymentInput) {
    const payment = await this.prisma.supplierPayment.create({ data });
    await this.notificationService.createNotification(
      payment.supplierId,
      'SUPPLIER_PAYMENT',
      `Payment of ${payment.amount} recorded for supplier`,
    );
    return payment;
  }
}
