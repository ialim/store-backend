import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FulfillmentType, AddressSource } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { SalesService } from '../src/modules/sale/sale.service';
import { SaleType } from '../src/shared/prismagraphql/prisma/sale-type.enum';
import { SaleChannel } from '../src/shared/prismagraphql/prisma/sale-channel.enum';

jest.setTimeout(60000);

describe('Order Workflow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sales: SalesService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    sales = app.get(SalesService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('walks a consumer quotation through sale to fulfilment', async () => {
    const unique = Date.now().toString(36);

    const role = await prisma.role.create({
      data: {
        name: `TEST_ROLE_${unique}`,
      },
    });

    const manager = await prisma.user.create({
      data: {
        email: `manager+${unique}@example.com`,
        passwordHash: 'hashed',
        roleId: role.id,
      },
    });

    const store = await prisma.store.create({
      data: {
        name: `Workflow Test Store ${unique}`,
        location: 'Test City',
        managerId: manager.id,
      },
    });

    const customer = await prisma.customer.create({
      data: {
        fullName: `Workflow Customer ${unique}`,
        preferredStoreId: store.id,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Workflow Product',
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: 'Workflow Variant',
        price: 2500,
        resellerPrice: 2000,
      },
    });

    const quotation = await sales.createQuotationDraft({
      type: SaleType.CONSUMER,
      channel: SaleChannel.WEB,
      storeId: store.id,
      consumerId: customer.id,
      billerId: manager.id,
      items: [
        {
          productVariantId: variant.id,
          quantity: 2,
          unitPrice: 2500,
        },
      ],
    });

    expect(quotation.saleOrderId).toBeDefined();
    const orderId = quotation.saleOrderId!;

    const draftSnapshot = await sales.getSaleWorkflowSnapshot(orderId);
    expect(draftSnapshot.state).toBe('AWAITING_PAYMENT_METHOD');
    expect(draftSnapshot.context).toBeDefined();

    await sales.checkoutConsumerQuotation({
      quotationId: quotation.id,
      billerId: manager.id,
    });

    const saleOrder = await prisma.saleOrder.findUnique({
      where: { id: orderId },
    });

    expect(saleOrder).toBeDefined();
    expect(saleOrder?.phase).toBe('SALE');
    expect(saleOrder?.workflowState).toBeDefined();
    expect(saleOrder?.workflowContext).toBeTruthy();

    const summary = await sales.creditCheck(orderId);
    expect(summary).not.toBeNull();
    expect(summary!.outstanding).toBeGreaterThan(0);
    expect((summary!.context as any)?.credit?.overage).toBeGreaterThan(0);

    const fulfilment = await sales.createFulfillment({
      saleOrderId: orderId,
      type: FulfillmentType.DELIVERY,
      deliveryPersonnelId: manager.id,
      deliveryDetails: {
        address: {
          formattedAddress: '123 Workflow Street, Test City',
          countryCode: 'NG',
          provider: `${AddressSource.MANUAL}`,
          streetLine1: '123 Workflow Street',
          city: 'Test City',
        },
        receiverName: 'Workflow Receiver',
        receiverPhone: '+2348000000000',
        deliveryNotes: 'Leave with reception',
      },
    });

    expect(fulfilment.workflowState).toBe('ALLOCATING_STOCK');
    expect(fulfilment.workflowContext).toBeTruthy();
    expect(fulfilment.deliveryAddressId).toBeDefined();
    expect(fulfilment.receiverName).toBe('Workflow Receiver');

    const fulfilmentSnapshot = await sales.getFulfilmentWorkflowSnapshot(
      orderId,
    );
    expect(fulfilmentSnapshot?.state).toBe('ALLOCATING_STOCK');
    expect(fulfilmentSnapshot?.context).toBeDefined();
  });
});
