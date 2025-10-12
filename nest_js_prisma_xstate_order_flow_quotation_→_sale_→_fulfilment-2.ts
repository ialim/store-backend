// ──────────────────────────────────────────────────────────────────────────────
// README (how to run)
// ──────────────────────────────────────────────────────────────────────────────
// 1) Ensure Node 18+, Postgres running, and pnpm or npm installed.
// 2) Create a .env with DATABASE_URL (see .env.example below).
// 3) Install deps:  pnpm i   (or: npm i)
// 4) Generate Prisma client & migrate:  pnpm prisma:migrate
// 5) Seed credit tiers & a sample customer: pnpm prisma:seed
// 6) Start the API: pnpm start:dev
// 7) Try the sample endpoints (see OrdersController routes at bottom of file list).
//
// Project layout (virtual):
//  - package.json
//  - prisma/schema.prisma
//  - src/prisma.service.ts
//  - src/common/outbox/outbox.service.ts
//  - src/domain/credit/tiers.ts
//  - src/state/quotation.machine.ts
//  - src/state/sale.machine.ts
//  - src/state/fulfilment.machine.ts
//  - src/state/coordinator.ts
//  - src/modules/orders/orders.module.ts
//  - src/modules/orders/orders.service.ts
//  - src/modules/orders/orders.controller.ts
//  - .env.example
//  - tsconfig.json
//  - nest-cli.json
//  - scripts/seed.ts

// ──────────────────────────────────────────────────────────────────────────────
// package.json
// ──────────────────────────────────────────────────────────────────────────────
{
  "name": "order-flow-xstate-nest-prisma",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "nest start",
    "start:dev": "nest start --watch",
    "prisma:migrate": "prisma migrate dev --name init",
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio",
    "prisma:seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' scripts/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/event-emitter": "^2.0.2",
    "@prisma/client": "^5.18.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "xstate": "^5.9.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/node": "^20.11.30",
    "prisma": "^5.18.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// .env.example
// ──────────────────────────────────────────────────────────────────────────────
// DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orderflow?schema=public"

// ──────────────────────────────────────────────────────────────────────────────
// prisma/schema.prisma
// ──────────────────────────────────────────────────────────────────────────────
// npx prisma init has already created the datasource & generator sections typically.
// Replace contents with the below.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum CreditTier {
  BRONZE
  SILVER
  GOLD
  PLATINUM
}

enum Phase {
  QUOTATION
  SALE
  FULFILMENT
}

enum OrderState {
  // We will store the *current* state's string here from the active machine
  DRAFT
  IN_REVIEW
  REVISED
  MUTUALLY_APPROVED
  AWAITING_PAYMENT_METHOD
  PAYMENT_INITIATED
  PAYMENT_PENDING_CONFIRMATION
  OVERRIDE_REVIEW
  CLEARED_FOR_FULFILMENT
  ALLOCATING_STOCK
  PICK_PACK
  READY_FOR_SHIPMENT
  SHIPPED
  DELIVERED
  SCHEDULING
  IN_PROGRESS
  RETURN_REQUESTED
  RETURN_RECEIVED
  REFUNDED
  COMPLETED
  CANCELLED
  FAILED
  EXPIRED
}

enum OverrideType {
  ADMIN
  CREDIT_LIMIT
}

enum OverrideStatus {
  PENDING
  APPROVED
  DENIED
  REVOKED
  EXPIRED
}

model Customer {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  credit    CustomerCreditProfile?
  salesAgg  CustomerSalesAgg?
  orders    Order[]
}

model CustomerCreditProfile {
  id         String     @id @default(cuid())
  customer   Customer   @relation(fields: [customerId], references: [id])
  customerId String     @unique
  tier       CreditTier
  customLimit Int?      // optional, to override tier limits if you ever need to
  exposure   Int        @default(0) // in kobo (minor units) for precision; or use Decimal
  updatedAt  DateTime   @updatedAt
}

model CustomerSalesAgg {
  id             String   @id @default(cuid())
  customer       Customer @relation(fields: [customerId], references: [id])
  customerId     String   @unique
  cumulativeSales Int     @default(0) // in kobo
  earnedLimit     Int     @default(0) // in kobo; 1 NGN earned per 100 NGN sales => earnedKobo = cumulativeSalesKobo / 100
  updatedAt      DateTime @updatedAt
}

model Quote {
  id              String   @id @default(cuid())
  customer        Customer @relation(fields: [customerId], references: [id])
  customerId      String
  status          OrderState // use DRAFT/IN_REVIEW/REVISED/MUTUALLY_APPROVED/EXPIRED/REJECTED/CANCELLED
  validUntil      DateTime
  buyerApprovedAt DateTime?
  sellerApprovedAt DateTime?
  version         Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  items           QuoteItem[]
}

model QuoteItem {
  id        String @id @default(cuid())
  quote     Quote  @relation(fields: [quoteId], references: [id])
  quoteId   String
  sku       String
  qty       Int
  unitPrice Int    // kobo
  discount  Int    @default(0)
  tax       Int    @default(0)
}

model Order {
  id            String     @id @default(cuid())
  customer      Customer   @relation(fields: [customerId], references: [id])
  customerId    String
  phase         Phase
  state         OrderState
  version       Int        @default(1)
  grandTotal    Int        // kobo
  currency      String     // e.g. "NGN"
  soldTermsJson Json
  capturedTotal Int        @default(0)
  clearToFulfilAt DateTime?
  overrideStatus String     @default("NONE")
  creditSnapshot Json?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  payments      Payment[]
  shipments     Shipment[]
  overrides     OverrideRequest[]
}

model Payment {
  id        String   @id @default(cuid())
  order     Order    @relation(fields: [orderId], references: [id])
  orderId   String
  status    String
  method    String
  amount    Int
  currency  String
  pspRefs   Json?
  capturedAt DateTime?
  createdAt DateTime @default(now())
}

model Shipment {
  id        String   @id @default(cuid())
  order     Order    @relation(fields: [orderId], references: [id])
  orderId   String
  carrier   String?
  tracking  String?
  status    String
  createdAt DateTime @default(now())
}

model OverrideRequest {
  id          String         @id @default(cuid())
  order       Order          @relation(fields: [orderId], references: [id])
  orderId     String
  type        OverrideType
  status      OverrideStatus
  requestedBy String
  approvedBy  String?
  reason      String?
  approvedAt  DateTime?
  expiresAt   DateTime?
  payload     Json?
  overageAmount Int?         // for CREDIT_LIMIT
  approvedAmount Int?        // for CREDIT_LIMIT
  createdAt   DateTime @default(now())
}

model TransitionLog {
  id         String   @id @default(cuid())
  entityId   String
  entityType String   // Quote | Order | Payment | Shipment
  fromState  String?
  toState    String
  event      String
  actor      String?
  payload    Json?
  at         DateTime @default(now())
}

model Outbox {
  id        String   @id @default(cuid())
  topic     String
  payload   Json
  createdAt DateTime @default(now())
  sentAt    DateTime?
}

// ──────────────────────────────────────────────────────────────────────────────
// src/prisma.service.ts
// ──────────────────────────────────────────────────────────────────────────────
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}

// ──────────────────────────────────────────────────────────────────────────────
// src/common/outbox/outbox.service.ts
// ──────────────────────────────────────────────────────────────────────────────
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class OutboxService {
  constructor(private prisma: PrismaService) {}
  async emit(topic: string, payload: any) {
    await this.prisma.outbox.create({ data: { topic, payload } });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// src/domain/credit/tiers.ts
// ──────────────────────────────────────────────────────────────────────────────
// Credit limits in kobo (minor units). Note: corrected the small typo in Gold lower bound.
export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export const TIERS: Record<Tier, { min: number; max: number }> = {
  BRONZE:   { min: 0,             max: 1_000_000_00 }, // 0 – 1,000,000 NGN
  SILVER:   { min: 1_000_001_00,  max: 5_000_000_00 }, // 1,000,001 – 5,000,000 NGN
  GOLD:     { min: 5_000_001_00,  max: 10_000_000_00 }, // 5,000,001 – 10,000,000 NGN
  PLATINUM: { min: 10_000_001_00, max: 15_000_000_00 }, // 10,000,001 – 15,000,000 NGN
};

export function tierLimit(tier: Tier, customLimit?: number): number {
  if (typeof customLimit === 'number' && customLimit > 0) return customLimit;
  return TIERS[tier].max;
}

// Earned credit rule: every 100 NGN sales => 1 NGN credit limit.
// With kobo minor units: earnedKobo = cumulativeSalesKobo / 100.
export function earnedLimitFromSalesKobo(cumulativeSalesKobo: number): number {
  if (cumulativeSalesKobo <= 0) return 0;
  return Math.floor(cumulativeSalesKobo / 100); // 100 kobo earned per 10,000 kobo sales
}

export function tierFromEarnedLimit(earnedLimitKobo: number): Tier {
  if (earnedLimitKobo >= TIERS.PLATINUM.min) return 'PLATINUM';
  if (earnedLimitKobo >= TIERS.GOLD.min) return 'GOLD';
  if (earnedLimitKobo >= TIERS.SILVER.min) return 'SILVER';
  return 'BRONZE';
}

export function effectiveLimitKobo(opts: { tier: Tier; customLimitKobo?: number; earnedLimitKobo?: number }): number {
  const base = tierLimit(opts.tier, opts.customLimitKobo);
  const earned = Math.max(0, opts.earnedLimitKobo ?? 0);
  // Final limit is the lesser of base cap and earned (you can opt to sum if policy says base + earned)
  return Math.min(base, earned);
}

// ──────────────────────────────────────────────────────────────────────────────
// src/state/quotation.machine.ts
// ──────────────────────────────────────────────────────────────────────────────
import { createMachine, assign } from 'xstate';

export type QuoteState =
  | 'DRAFT' | 'IN_REVIEW' | 'REVISED'
  | 'APPROVED_BY_BUYER' | 'APPROVED_BY_SELLER' | 'MUTUALLY_APPROVED'
  | 'EXPIRED' | 'REJECTED' | 'CANCELLED';

export type QuoteEvent =
  | { type: 'SHARE' } | { type: 'EDIT' }
  | { type: 'BUYER_APPROVES' } | { type: 'SELLER_APPROVES' }
  | { type: 'DECLINE' } | { type: 'EXPIRE' } | { type: 'WITHDRAW' } | { type: 'EXTEND_VALIDITY'; days: number };

export interface QuoteCtx {
  id: string;
  validUntil: number; // epoch ms
  buyerApproved?: boolean;
  sellerApproved?: boolean;
}

export const quotationMachine = createMachine<QuoteCtx, QuoteEvent>({
  id: 'quotation',
  initial: 'DRAFT',
  states: {
    DRAFT: { on: { SHARE: 'IN_REVIEW', WITHDRAW: 'CANCELLED' } },
    IN_REVIEW: {
      on: { EDIT: 'REVISED', BUYER_APPROVES: 'APPROVED_BY_BUYER', SELLER_APPROVES: 'APPROVED_BY_SELLER', DECLINE: 'REJECTED' }
    },
    REVISED: { on: { SHARE: 'IN_REVIEW', DECLINE: 'REJECTED' } },
    APPROVED_BY_BUYER: { on: { SELLER_APPROVES: 'MUTUALLY_APPROVED', EDIT: 'REVISED' } },
    APPROVED_BY_SELLER: { on: { BUYER_APPROVES: 'MUTUALLY_APPROVED', EDIT: 'REVISED' } },
    MUTUALLY_APPROVED: { type: 'final' },
    EXPIRED: { type: 'final' },
    REJECTED: { type: 'final' },
    CANCELLED: { type: 'final' }
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// src/state/sale.machine.ts
// ──────────────────────────────────────────────────────────────────────────────
import { createMachine, assign } from 'xstate';

export type SaleState =
  | 'AWAITING_PAYMENT_METHOD' | 'PAYMENT_INITIATED' | 'PAYMENT_PENDING_CONFIRMATION'
  | 'OVERRIDE_REVIEW' | 'CLEARED_FOR_FULFILMENT' | 'PAYMENT_FAILED' | 'CANCELLED';

export type SaleEvent =
  | { type: 'SET_PAYMENT_METHOD'; method: 'card' | 'bank' | 'invoice' | 'po' }
  | { type: 'INITIATE_PAYMENT' }
  | { type: 'PAYMENT_AUTHORIZED' } | { type: 'PAYMENT_CAPTURED'; amount: number }
  | { type: 'PAYMENT_FAILED' } | { type: 'PAYMENT_EXPIRED' }
  | { type: 'ADMIN_OVERRIDE_REQUESTED'; reason: string }
  | { type: 'ADMIN_OVERRIDE_GRANTED'; expiresAt: string }
  | { type: 'ADMIN_OVERRIDE_DENIED' }
  | { type: 'CREDIT_OVERRIDE_REQUIRED'; overage: number }
  | { type: 'CREDIT_OVERRIDE_GRANTED'; approvedAmount: number; expiresAt: string }
  | { type: 'CREDIT_OVERRIDE_DENIED' }
  | { type: 'OVERRIDE_REVOKED' }
  | { type: 'CANCEL_REQUESTED' };

export interface SaleCtx {
  orderId: string;
  grandTotal: number;      // kobo
  capturedTotal: number;   // kobo
  credit: { limit: number; exposure: number; overage?: number };
  overrides: {
    admin?: { status: 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED'; expiresAt?: string };
    credit?: { status: 'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED'; approvedAmount?: number; expiresAt?: string };
  };
}

function isExpired(expiresAt?: string) {
  return !!expiresAt && new Date(expiresAt).getTime() < Date.now();
}

export const saleMachine = createMachine<SaleCtx, SaleEvent>({
  id: 'sale',
  initial: 'AWAITING_PAYMENT_METHOD',
  states: {
    AWAITING_PAYMENT_METHOD: {
      on: { SET_PAYMENT_METHOD: 'PAYMENT_INITIATED', ADMIN_OVERRIDE_REQUESTED: 'OVERRIDE_REVIEW' }
    },
    PAYMENT_INITIATED: {
      entry: 'runCreditCheck',
      on: {
        PAYMENT_AUTHORIZED: 'PAYMENT_PENDING_CONFIRMATION',
        CREDIT_OVERRIDE_REQUIRED: { target: 'OVERRIDE_REVIEW', actions: 'recordOverage' }
      }
    },
    PAYMENT_PENDING_CONFIRMATION: {
      on: {
        PAYMENT_CAPTURED: [
          { target: 'CLEARED_FOR_FULFILMENT', cond: 'isPaymentSatisfied', actions: 'markClearToFulfil' },
          { actions: 'accumulateCapture' }
        ],
        PAYMENT_FAILED: 'PAYMENT_FAILED',
        ADMIN_OVERRIDE_REQUESTED: 'OVERRIDE_REVIEW'
      }
    },
    OVERRIDE_REVIEW: {
      on: {
        ADMIN_OVERRIDE_GRANTED: [
          { target: 'CLEARED_FOR_FULFILMENT', cond: 'isClearToFulfil', actions: 'markClearToFulfil' },
          { actions: 'saveAdminOverride' }
        ],
        CREDIT_OVERRIDE_GRANTED: [
          { target: 'CLEARED_FOR_FULFILMENT', cond: 'isClearToFulfil', actions: 'markClearToFulfil' },
          { actions: 'saveCreditOverride' }
        ],
        ADMIN_OVERRIDE_DENIED: 'PAYMENT_INITIATED',
        CREDIT_OVERRIDE_DENIED: 'PAYMENT_INITIATED',
        OVERRIDE_REVOKED: 'PAYMENT_INITIATED'
      }
    },
    CLEARED_FOR_FULFILMENT: { type: 'final', entry: 'emitSaleCleared' },
    PAYMENT_FAILED: { on: { INITIATE_PAYMENT: 'PAYMENT_INITIATED', CANCEL_REQUESTED: 'CANCELLED' } },
    CANCELLED: { type: 'final' }
  }
}, {
  guards: {
    isPaymentSatisfied: (ctx) => ctx.capturedTotal >= ctx.grandTotal,
    needsCreditOverride: (ctx) => (ctx.credit.exposure + ctx.grandTotal) > ctx.credit.limit,
    hasValidAdminOverride: (ctx) => ctx.overrides.admin?.status === 'APPROVED' && !isExpired(ctx.overrides.admin?.expiresAt),
    hasValidCreditOverride: (ctx) => ctx.overrides.credit?.status === 'APPROVED' && !isExpired(ctx.overrides.credit?.expiresAt) && (ctx.overrides.credit.approvedAmount ?? 0) >= (ctx.credit.overage ?? 0),
    isClearToFulfil: (ctx) => (ctx.capturedTotal >= ctx.grandTotal) || (ctx.overrides.admin?.status === 'APPROVED' && !isExpired(ctx.overrides.admin?.expiresAt) && (!((ctx.credit.exposure + ctx.grandTotal) > ctx.credit.limit) || (ctx.overrides.credit?.status === 'APPROVED' && !isExpired(ctx.overrides.credit?.expiresAt) && (ctx.overrides.credit.approvedAmount ?? 0) >= (ctx.credit.overage ?? 0))))
  },
  actions: {
    runCreditCheck: () => {/* call service to compute exposure/overage and raise CREDIT_OVERRIDE_REQUIRED if needed */},
    recordOverage: assign({ credit: (ctx, e: any) => ({ ...ctx.credit, overage: e.overage }) }),
    accumulateCapture: assign({ capturedTotal: (ctx, e: any) => ctx.capturedTotal + (e.amount ?? 0) }),
    saveAdminOverride: assign({ overrides: (ctx) => ({ ...ctx.overrides, admin: { status: 'APPROVED' } }) }),
    saveCreditOverride: assign({ overrides: (ctx, e: any) => ({ ...ctx.overrides, credit: { status: 'APPROVED', approvedAmount: e.approvedAmount, expiresAt: e.expiresAt } }) }),
    markClearToFulfil: () => {/* set flag in DB, write outbox */},
    emitSaleCleared: () => {/* outbox: payment.or.override.cleared */}
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// src/state/fulfilment.machine.ts
// ──────────────────────────────────────────────────────────────────────────────
import { createMachine } from 'xstate';

export type FulfilState =
  | 'ALLOCATING_STOCK' | 'PICK_PACK' | 'READY_FOR_SHIPMENT' | 'SHIPPED' | 'DELIVERED'
  | 'SCHEDULING' | 'IN_PROGRESS'
  | 'ON_HOLD' | 'BACKORDERED'
  | 'RETURN_REQUESTED' | 'RETURN_RECEIVED' | 'REFUNDED'
  | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export type FulfilEvent =
  | { type: 'RESERVE_OK' } | { type: 'RESERVE_MISS' }
  | { type: 'FULFILMENT_STARTED' } | { type: 'PACKAGE_SHIPPED' } | { type: 'PACKAGE_DELIVERED' }
  | { type: 'SERVICE_SCHEDULED' } | { type: 'SERVICE_COMPLETED' }
  | { type: 'RETURN_REQUESTED' } | { type: 'RETURN_RECEIVED' } | { type: 'REFUND_ISSUED' };

export const fulfilmentMachine = createMachine<any, FulfilEvent>({
  id: 'fulfilment',
  initial: 'ALLOCATING_STOCK',
  states: {
    ALLOCATING_STOCK: { on: { RESERVE_OK: 'PICK_PACK', RESERVE_MISS: 'BACKORDERED' } },
    BACKORDERED: { on: { RESERVE_OK: 'PICK_PACK' } },
    PICK_PACK: { on: { FULFILMENT_STARTED: 'READY_FOR_SHIPMENT' } },
    READY_FOR_SHIPMENT: { on: { PACKAGE_SHIPPED: 'SHIPPED' } },
    SHIPPED: { on: { PACKAGE_DELIVERED: 'DELIVERED' } },
    DELIVERED: { on: { RETURN_REQUESTED: 'RETURN_REQUESTED' } },
    RETURN_REQUESTED: { on: { RETURN_RECEIVED: 'REFUNDED' } },
    REFUNDED: { type: 'final' },
    COMPLETED: { type: 'final' },
    CANCELLED: { type: 'final' },
    FAILED: { type: 'final' },
    SCHEDULING: {},
    IN_PROGRESS: {}
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// src/state/coordinator.ts
// ──────────────────────────────────────────────────────────────────────────────
import { Injectable } from '@nestjs/common';
import { OutboxService } from '../common/outbox/outbox.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PhaseCoordinator {
  constructor(private outbox: OutboxService, private prisma: PrismaService) {}

  async onQuotationApproved(quoteId: string, orderId: string) {
    // Create Order in SALE phase from quote snapshot
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId }, include: { items: true, customer: { include: { credit: true } } } });
    if (!quote) throw new Error('Quote not found');
    const grandTotal = quote.items.reduce((sum, i) => sum + (i.unitPrice * i.qty) - i.discount + i.tax, 0);
    await this.prisma.order.create({ data: {
      id: orderId,
      customerId: quote.customerId,
      phase: 'SALE',
      state: 'AWAITING_PAYMENT_METHOD',
      currency: 'NGN',
      grandTotal,
      soldTermsJson: { quoteId, version: quote.version, items: quote.items }
    }});
    await this.prisma.transitionLog.create({ data: { entityId: orderId, entityType: 'Order', toState: 'AWAITING_PAYMENT_METHOD', event: 'quotation.mutually_approved' } });
    await this.outbox.emit('quotation.mutually_approved', { quoteId, orderId });
  }

  async onSaleCleared(orderId: string) {
    // Move to fulfilment phase (create fulfilment records, etc.)
    await this.prisma.order.update({ where: { id: orderId }, data: { phase: 'FULFILMENT', state: 'ALLOCATING_STOCK', clearToFulfilAt: new Date() } });
    await this.prisma.transitionLog.create({ data: { entityId: orderId, entityType: 'Order', toState: 'ALLOCATING_STOCK', event: 'sale.cleared' } });
    await this.outbox.emit('payment.received.or.override.cleared', { orderId });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// src/modules/orders/orders.module.ts
// ──────────────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../../prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { PhaseCoordinator } from '../../state/coordinator';

@Module({
  providers: [OrdersService, PrismaService, OutboxService, PhaseCoordinator],
  controllers: [OrdersController]
})
export class OrdersModule {}

// ──────────────────────────────────────────────────────────────────────────────
// src/modules/orders/orders.service.ts
// ──────────────────────────────────────────────────────────────────────────────
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { effectiveLimitKobo, earnedLimitFromSalesKobo, tierFromEarnedLimit } from '../../domain/credit/tiers';
import { PhaseCoordinator } from '../../state/coordinator';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private coordinator: PhaseCoordinator) {}

  async approveBothPartiesAndPromote(quoteId: string) {
    // Called when quotation machine hits MUTUALLY_APPROVED
    const orderId = (await this.prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT gen_random_uuid()`))[0]?.id || undefined;
    await this.coordinator.onQuotationApproved(quoteId, orderId || undefined as any);
    return { orderId };
  }

  async runCreditCheck(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { customer: { include: { credit: true, salesAgg: true } } } });
    if (!order || !order.customer) throw new Error('Order not found');
    const profile = order.customer.credit;
    if (!profile) throw new Error('Customer credit profile missing');

    const salesAgg = order.customer.salesAgg;
    const earned = earnedLimitFromSalesKobo(salesAgg?.cumulativeSales ?? 0);

    const baseTier = profile.tier as any;
    // You may choose to upgrade tier from earned instantly:
    const dynamicTier = tierFromEarnedLimit(earned);

    const limit = effectiveLimitKobo({ tier: dynamicTier, customLimitKobo: profile.customLimit ?? undefined, earnedLimitKobo: earned });
    const exposure = profile.exposure; // assumed maintained elsewhere

    const needsOverride = (exposure + order.grandTotal) > limit;
    const overage = Math.max(0, (exposure + order.grandTotal) - limit);

    await this.prisma.order.update({ where: { id: orderId }, data: { creditSnapshot: { dynamicTier, limit, exposure, earned, overage } } });

    return { dynamicTier, limit, exposure, earned, needsOverride, overage };
  }

  async grantAdminOverride(orderId: string, approvedBy: string, expiresAt?: Date) {
    await this.prisma.overrideRequest.create({ data: { orderId, type: 'ADMIN', status: 'APPROVED', approvedBy, approvedAt: new Date(), expiresAt } });
    return { ok: true };
  }

  async grantCreditOverride(orderId: string, approvedBy: string, approvedAmount: number, expiresAt?: Date) {
    await this.prisma.overrideRequest.create({ data: { orderId, type: 'CREDIT_LIMIT', status: 'APPROVED', approvedBy, approvedAt: new Date(), expiresAt, approvedAmount } });
    return { ok: true };
  }

  async markSaleCleared(orderId: string) {
    await this.coordinator.onSaleCleared(orderId);
    return { ok: true };
  }

  // ── NEW: record completed sales to accrue earned credit and auto-upgrade tier
  async recordSaleCompletion(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { customer: { include: { salesAgg: true, credit: true } } } });
    if (!order) throw new Error('Order not found');
    const customerId = order.customerId;

    // 1) Accrue sales (in kobo)
    const agg = await this.prisma.customerSalesAgg.upsert({
      where: { customerId },
      update: { cumulativeSales: { increment: order.grandTotal } },
      create: { customerId, cumulativeSales: order.grandTotal, earnedLimit: 0 }
    });

    // 2) Recompute earned limit & dynamic tier
    const cumulative = agg.cumulativeSales + 0; // refreshed value is not returned by upsert increment, re-fetch
    const fresh = await this.prisma.customerSalesAgg.findUnique({ where: { customerId } });
    const earned = earnedLimitFromSalesKobo(fresh?.cumulativeSales ?? cumulative);

    const dynamicTier = tierFromEarnedLimit(earned);

    // 3) Persist earnedLimit and possibly upgrade tier
    await this.prisma.$transaction([
      this.prisma.customerSalesAgg.update({ where: { customerId }, data: { earnedLimit: earned } }),
      this.prisma.customerCreditProfile.update({ where: { customerId }, data: { tier: dynamicTier as any } })
    ]);

    return { customerId, cumulativeSales: fresh?.cumulativeSales ?? cumulative, earnedLimit: earned, dynamicTier };
  }
}

  async approveBothPartiesAndPromote(quoteId: string) {
    // Called when quotation machine hits MUTUALLY_APPROVED
    const orderId = (await this.prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT gen_random_uuid()`))[0]?.id || undefined;
    await this.coordinator.onQuotationApproved(quoteId, orderId || undefined as any);
    return { orderId };
  }

  async runCreditCheck(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { customer: { include: { credit: true } } } });
    if (!order || !order.customer) throw new Error('Order not found');
    const profile = order.customer.credit;
    if (!profile) throw new Error('Customer credit profile missing');

    const limit = tierLimit(profile.tier as any, profile.customLimit ?? undefined);
    const exposure = profile.exposure; // assumed maintained elsewhere

    const needsOverride = (exposure + order.grandTotal) > limit;
    const overage = Math.max(0, (exposure + order.grandTotal) - limit);

    await this.prisma.order.update({ where: { id: orderId }, data: { creditSnapshot: { limit, exposure, overage } } });

    return { needsOverride, overage };
  }

  async grantAdminOverride(orderId: string, approvedBy: string, expiresAt?: Date) {
    await this.prisma.overrideRequest.create({ data: { orderId, type: 'ADMIN', status: 'APPROVED', approvedBy, approvedAt: new Date(), expiresAt } });
    return { ok: true };
  }

  async grantCreditOverride(orderId: string, approvedBy: string, approvedAmount: number, expiresAt?: Date) {
    await this.prisma.overrideRequest.create({ data: { orderId, type: 'CREDIT_LIMIT', status: 'APPROVED', approvedBy, approvedAt: new Date(), expiresAt, approvedAmount } });
    return { ok: true };
  }

  async markSaleCleared(orderId: string) {
    await this.coordinator.onSaleCleared(orderId);
    return { ok: true };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// src/modules/orders/orders.controller.ts
// ──────────────────────────────────────────────────────────────────────────────
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private svc: OrdersService) {}

  // Simulates quotation promotion to sale phase
  @Post('quotes/:quoteId/promote')
  async promote(@Param('quoteId') quoteId: string) { return this.svc.approveBothPartiesAndPromote(quoteId); }

  // Run credit check (returns overage)
  @Get(':orderId/credit-check')
  async credit(@Param('orderId') orderId: string) { return this.svc.runCreditCheck(orderId); }

  // Approvals
  @Post(':orderId/overrides/admin/approve')
  async adminApprove(@Param('orderId') orderId: string, @Body() body: { approvedBy: string; expiresAt?: string }) {
    return this.svc.grantAdminOverride(orderId, body.approvedBy, body.expiresAt ? new Date(body.expiresAt) : undefined);
  }

  @Post(':orderId/overrides/credit/approve')
  async creditApprove(@Param('orderId') orderId: string, @Body() body: { approvedBy: string; approvedAmount: number; expiresAt?: string }) {
    return this.svc.grantCreditOverride(orderId, body.approvedBy, body.approvedAmount, body.expiresAt ? new Date(body.expiresAt) : undefined);
  }

  // Clear to fulfil (normally emitted by the state machine when guards satisfied)
  @Post(':orderId/clear')
  async clear(@Param('orderId') orderId: string) { return this.svc.markSaleCleared(orderId); }

  // NEW: mark order as completed (simulate delivery & completion) and accrue sales → credit
  @Post(':orderId/complete')
  async complete(@Param('orderId') orderId: string) { return this.svc.recordSaleCompletion(orderId); }
}

  // Simulates quotation promotion to sale phase
  @Post('quotes/:quoteId/promote')
  async promote(@Param('quoteId') quoteId: string) { return this.svc.approveBothPartiesAndPromote(quoteId); }

  // Run credit check (returns overage)
  @Get(':orderId/credit-check')
  async credit(@Param('orderId') orderId: string) { return this.svc.runCreditCheck(orderId); }

  // Approvals
  @Post(':orderId/overrides/admin/approve')
  async adminApprove(@Param('orderId') orderId: string, @Body() body: { approvedBy: string; expiresAt?: string }) {
    return this.svc.grantAdminOverride(orderId, body.approvedBy, body.expiresAt ? new Date(body.expiresAt) : undefined);
  }

  @Post(':orderId/overrides/credit/approve')
  async creditApprove(@Param('orderId') orderId: string, @Body() body: { approvedBy: string; approvedAmount: number; expiresAt?: string }) {
    return this.svc.grantCreditOverride(orderId, body.approvedBy, body.approvedAmount, body.expiresAt ? new Date(body.expiresAt) : undefined);
  }

  // Clear to fulfil (normally emitted by the state machine when guards satisfied)
  @Post(':orderId/clear')
  async clear(@Param('orderId') orderId: string) { return this.svc.markSaleCleared(orderId); }
}

// ──────────────────────────────────────────────────────────────────────────────
// tsconfig.json
// ──────────────────────────────────────────────────────────────────────────────
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": false,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "es2019",
    "sourceMap": true,
    "outDir": "dist",
    "baseUrl": ".",
    "incremental": true,
    "strict": true
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// nest-cli.json
// ──────────────────────────────────────────────────────────────────────────────
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}

// ──────────────────────────────────────────────────────────────────────────────
// scripts/seed.ts
// ──────────────────────────────────────────────────────────────────────────────
import { PrismaClient, CreditTier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.upsert({
    where: { email: 'buyer@example.com' },
    update: {},
    create: { name: 'Sample Buyer', email: 'buyer@example.com' }
  });

  await prisma.customerCreditProfile.upsert({
    where: { customerId: customer.id },
    update: { tier: CreditTier.SILVER, exposure: 0 },
    create: { customerId: customer.id, tier: CreditTier.SILVER, exposure: 0 }
  });

  // Seed a quote with items
  const quote = await prisma.quote.create({
    data: {
      customerId: customer.id,
      status: 'DRAFT',
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      items: { create: [
        { sku: 'SKU-001', qty: 2, unitPrice: 250_000_00 }, // 250,000 NGN each
        { sku: 'SKU-002', qty: 1, unitPrice: 600_000_00 }
      ]}
    },
    include: { items: true }
  });

  console.log('Seeded customer:', customer.id);
  console.log('Seeded quote:', quote.id);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
