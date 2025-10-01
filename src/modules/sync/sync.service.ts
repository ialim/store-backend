import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  LegacySyncEntity,
  MovementDirection,
  MovementType,
  LegacyPriceSnapshot,
  LegacyTicket,
  LegacyInvoice,
  Store,
  ProductVariant,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DomainEventsService } from '../events/services/domain-events.service';
import { LegacyPriceRowDto } from './dto/sync-prices.dto';
import { LegacyTicketDto } from './dto/sync-tickets.dto';
import { LegacyInvoiceDto } from './dto/sync-invoices.dto';

type TransactionClient = Prisma.TransactionClient;
type LegacyPriceSnapshotRecord = LegacyPriceSnapshot;
type LegacyTicketRecord = LegacyTicket;
type LegacyInvoiceRecord = LegacyInvoice;
type StoreRecord = Store;
type VariantRecord = ProductVariant;

type ResolutionCache = {
  stores: Map<string, StoreRecord>;
  variants: Map<string, VariantRecord>;
};

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  async syncPrices(rows: LegacyPriceRowDto[]) {
    if (!rows.length) return { processed: 0, applied: 0, failed: 0 };

    let applied = 0;
    let failed = 0;

    const groups = this.groupBy(rows, (row) => row.storeCode);
    for (const [storeCode, storeRows] of groups.entries()) {
      let latestCursor: string | null = null;
      const cache: ResolutionCache = {
        stores: new Map<string, StoreRecord>(),
        variants: new Map<string, VariantRecord>(),
      };

      await this.prisma.$transaction(async (tx) => {
        for (const row of storeRows) {
          const priceDate = new Date(row.priceDate);
          const stockDate = row.stockDate ? new Date(row.stockDate) : null;
          const snapshotDate = stockDate ?? priceDate;
          const isoCandidate = snapshotDate.toISOString();
          if (!latestCursor || isoCandidate > latestCursor) {
            latestCursor = isoCandidate;
          }

          const identity = this.buildPriceIdentity(row, snapshotDate);
          const createData: Prisma.LegacyPriceSnapshotCreateInput = {
            identity,
            storeCode: row.storeCode,
            tariffId: row.tariffId,
            articleCode: row.articleCode,
            sizeCode: row.sizeCode ?? null,
            colorCode: row.colorCode ?? null,
            formatCode: row.formatCode ?? null,
            priceGross: row.priceGross ?? null,
            discount: row.discount ?? null,
            priceNet: row.priceNet ?? null,
            priceGrossAlt: row.priceGrossAlt ?? null,
            discountAlt: row.discountAlt ?? null,
            priceNetAlt: row.priceNetAlt ?? null,
            priceDate,
            warehouseCode: row.warehouseCode,
            stockQuantity: row.stockQuantity ?? null,
            stockDate,
            processedAt: null,
            processingError: null,
          };
          const updateData: Prisma.LegacyPriceSnapshotUpdateInput = {
            priceGross: row.priceGross ?? null,
            discount: row.discount ?? null,
            priceNet: row.priceNet ?? null,
            priceGrossAlt: row.priceGrossAlt ?? null,
            discountAlt: row.discountAlt ?? null,
            priceNetAlt: row.priceNetAlt ?? null,
            stockQuantity: row.stockQuantity ?? null,
            stockDate,
            processedAt: null,
            processingError: null,
          };

          let snapshot: LegacyPriceSnapshotRecord | null = null;
          try {
            snapshot = await tx.legacyPriceSnapshot.upsert({
              where: { identity },
              create: createData,
              update: updateData,
            });
            await this.applyPriceSnapshot(tx, snapshot, cache);
            await tx.legacyPriceSnapshot.update({
              where: { id: snapshot.id },
              data: { processedAt: new Date(), processingError: null },
            });
            applied += 1;
          } catch (error) {
            failed += 1;
            const message = this.errorMessage(error);
            this.logger.warn(
              `Failed to apply price snapshot ${identity}: ${message}`,
            );
            if (snapshot) {
              await tx.legacyPriceSnapshot.update({
                where: { id: snapshot.id },
                data: {
                  processedAt: new Date(),
                  processingError: message,
                },
              });
            } else {
              await tx.legacyPriceSnapshot.upsert({
                where: { identity },
                create: {
                  ...createData,
                  processedAt: new Date(),
                  processingError: message,
                },
                update: {
                  ...updateData,
                  processedAt: new Date(),
                  processingError: message,
                },
              });
            }
          }
        }
      });

      if (latestCursor) {
        await this.upsertCursor(
          LegacySyncEntity.PRICES,
          storeCode,
          latestCursor,
        );
      }
    }

    return { processed: rows.length, applied, failed };
  }

  async syncTickets(tickets: LegacyTicketDto[]) {
    if (!tickets.length) return { processed: 0, applied: 0, failed: 0 };

    let applied = 0;
    let failed = 0;

    const groups = this.groupBy(tickets, (ticket) => ticket.storeCode);
    for (const [storeCode, storeTickets] of groups.entries()) {
      let latestIssuedCursor: string | null = null;
      let latestTicketNumber: number | null = null;
      const cache: ResolutionCache = {
        stores: new Map<string, StoreRecord>(),
        variants: new Map<string, VariantRecord>(),
      };

      await this.prisma.$transaction(async (tx) => {
        for (const ticket of storeTickets) {
          const issuedAt = new Date(ticket.issuedAt);
          const openedAt = ticket.openedAt ? new Date(ticket.openedAt) : null;
          const closedAt = ticket.closedAt ? new Date(ticket.closedAt) : null;
          const issuedIso = issuedAt.toISOString();
          if (!latestIssuedCursor || issuedIso > latestIssuedCursor) {
            latestIssuedCursor = issuedIso;
          }
          if (ticket.ticketNumber != null) {
            latestTicketNumber = this.pickLargest(
              latestTicketNumber,
              ticket.ticketNumber,
            );
          }

          const ticketIdentity = this.buildTicketIdentity(ticket);
          const createData: Prisma.LegacyTicketCreateInput = {
            identity: ticketIdentity,
            storeCode: ticket.storeCode,
            warehouseCode: ticket.warehouseCode ?? null,
            fo: ticket.fo ?? null,
            serie: ticket.serie ?? null,
            ticketNumber: ticket.ticketNumber ?? null,
            suffix: ticket.suffix ?? null,
            issuedAt,
            openedAt,
            closedAt,
            totalNet: ticket.totalNet ?? null,
            customerCode: ticket.customerCode ?? null,
            vendorCode: ticket.vendorCode ?? null,
            processedAt: null,
            processingError: null,
          };
          const updateData: Prisma.LegacyTicketUpdateInput = {
            warehouseCode: ticket.warehouseCode ?? null,
            fo: ticket.fo ?? null,
            serie: ticket.serie ?? null,
            ticketNumber: ticket.ticketNumber ?? null,
            suffix: ticket.suffix ?? null,
            issuedAt,
            openedAt,
            closedAt,
            totalNet: ticket.totalNet ?? null,
            customerCode: ticket.customerCode ?? null,
            vendorCode: ticket.vendorCode ?? null,
            processedAt: null,
            processingError: null,
          };

          let persisted: LegacyTicketRecord | null = null;
          try {
            persisted = await tx.legacyTicket.upsert({
              where: { identity: ticketIdentity },
              create: createData,
              update: updateData,
            });

            await tx.legacyTicketLine.deleteMany({
              where: { ticketId: persisted.id },
            });

            if (ticket.lines.length) {
              await tx.legacyTicketLine.createMany({
                data: ticket.lines.map((line) => ({
                  ticketId: persisted!.id,
                  lineNumber: line.lineNumber,
                  articleCode: line.articleCode,
                  sizeCode: line.sizeCode ?? null,
                  colorCode: line.colorCode ?? null,
                  quantity: line.quantity ?? null,
                  price: line.price ?? null,
                  priceVat: line.priceVat ?? null,
                  total: line.total ?? null,
                  vendorCode: line.vendorCode ?? null,
                })),
              });
            }

            await this.applyTicket(tx, persisted, cache);
            await tx.legacyTicket.update({
              where: { id: persisted.id },
              data: { processedAt: new Date(), processingError: null },
            });
            applied += 1;
          } catch (error) {
            failed += 1;
            const message = this.errorMessage(error);
            this.logger.warn(
              `Failed to apply ticket ${ticketIdentity}: ${message}`,
            );
            if (persisted) {
              await tx.legacyTicket.update({
                where: { id: persisted.id },
                data: { processedAt: new Date(), processingError: message },
              });
            } else {
              await tx.legacyTicket.upsert({
                where: { identity: ticketIdentity },
                create: {
                  ...createData,
                  processedAt: new Date(),
                  processingError: message,
                },
                update: {
                  ...updateData,
                  processedAt: new Date(),
                  processingError: message,
                },
              });
            }
          }
        }
      });

      if (latestIssuedCursor) {
        const cursorPayload = {
          issuedAt: latestIssuedCursor,
          ticketNumber: latestTicketNumber,
        } satisfies Record<string, unknown>;
        await this.upsertCursor(
          LegacySyncEntity.SALES_TICKET,
          storeCode,
          JSON.stringify(cursorPayload),
        );
      }
    }

    return { processed: tickets.length, applied, failed };
  }

  async syncInvoices(invoices: LegacyInvoiceDto[]) {
    if (!invoices.length) return { processed: 0, applied: 0, failed: 0 };

    let applied = 0;
    let failed = 0;

    const groups = this.groupBy(invoices, (invoice) => invoice.storeCode);
    for (const [storeCode, storeInvoices] of groups.entries()) {
      let latestIssuedCursor: string | null = null;
      let latestNumber: number | null = null;
      const cache: ResolutionCache = {
        stores: new Map<string, StoreRecord>(),
        variants: new Map<string, VariantRecord>(),
      };

      await this.prisma.$transaction(async (tx) => {
        for (const invoice of storeInvoices) {
          const issuedAt = new Date(invoice.issuedAt);
          const issuedIso = issuedAt.toISOString();
          if (!latestIssuedCursor || issuedIso > latestIssuedCursor) {
            latestIssuedCursor = issuedIso;
          }
          if (invoice.invoiceNumber != null) {
            latestNumber = this.pickLargest(
              latestNumber,
              invoice.invoiceNumber,
            );
          }

          const identity = this.buildInvoiceIdentity(invoice);
          const createData: Prisma.LegacyInvoiceCreateInput = {
            identity,
            storeCode: invoice.storeCode,
            warehouseCode: invoice.warehouseCode ?? null,
            serie: invoice.serie ?? null,
            invoiceNumber: invoice.invoiceNumber ?? null,
            suffix: invoice.suffix ?? null,
            issuedAt,
            totalNet: invoice.totalNet ?? null,
            customerCode: invoice.customerCode ?? null,
            vendorCode: invoice.vendorCode ?? null,
            processedAt: null,
            processingError: null,
          };
          const updateData: Prisma.LegacyInvoiceUpdateInput = {
            warehouseCode: invoice.warehouseCode ?? null,
            serie: invoice.serie ?? null,
            invoiceNumber: invoice.invoiceNumber ?? null,
            suffix: invoice.suffix ?? null,
            issuedAt,
            totalNet: invoice.totalNet ?? null,
            customerCode: invoice.customerCode ?? null,
            vendorCode: invoice.vendorCode ?? null,
            processedAt: null,
            processingError: null,
          };

          let persisted: LegacyInvoiceRecord | null = null;
          try {
            persisted = await tx.legacyInvoice.upsert({
              where: { identity },
              create: createData,
              update: updateData,
            });

            await tx.legacyInvoiceLine.deleteMany({
              where: { invoiceId: persisted.id },
            });

            if (invoice.lines.length) {
              await tx.legacyInvoiceLine.createMany({
                data: invoice.lines.map((line) => ({
                  invoiceId: persisted!.id,
                  lineNumber: line.lineNumber,
                  articleCode: line.articleCode,
                  sizeCode: line.sizeCode ?? null,
                  colorCode: line.colorCode ?? null,
                  quantity: line.quantity ?? null,
                  price: line.price ?? null,
                  priceVat: line.priceVat ?? null,
                  total: line.total ?? null,
                })),
              });
            }

            await this.applyInvoice(tx, persisted, cache);
            await tx.legacyInvoice.update({
              where: { id: persisted.id },
              data: { processedAt: new Date(), processingError: null },
            });
            applied += 1;
          } catch (error) {
            failed += 1;
            const message = this.errorMessage(error);
            this.logger.warn(`Failed to apply invoice ${identity}: ${message}`);
            if (persisted) {
              await tx.legacyInvoice.update({
                where: { id: persisted.id },
                data: { processedAt: new Date(), processingError: message },
              });
            } else {
              await tx.legacyInvoice.upsert({
                where: { identity },
                create: {
                  ...createData,
                  processedAt: new Date(),
                  processingError: message,
                },
                update: {
                  ...updateData,
                  processedAt: new Date(),
                  processingError: message,
                },
              });
            }
          }
        }
      });

      if (latestIssuedCursor) {
        const cursorPayload = {
          issuedAt: latestIssuedCursor,
          invoiceNumber: latestNumber,
        } satisfies Record<string, unknown>;
        await this.upsertCursor(
          LegacySyncEntity.SALES_INVOICE,
          storeCode,
          JSON.stringify(cursorPayload),
        );
      }
    }

    return { processed: invoices.length, applied, failed };
  }

  private async applyPriceSnapshot(
    tx: TransactionClient,
    snapshot: LegacyPriceSnapshotRecord,
    cache: ResolutionCache,
  ) {
    const store = await this.resolveStore(tx, snapshot.storeCode, cache);
    const variant = await this.resolveVariant(
      tx,
      {
        articleCode: snapshot.articleCode,
        sizeCode: snapshot.sizeCode ?? null,
        colorCode: snapshot.colorCode ?? null,
      },
      cache,
    );

    const priceNet = this.coalesceNumber(
      snapshot.priceNet,
      snapshot.priceNetAlt,
      snapshot.priceGross,
      snapshot.priceGrossAlt,
    );
    const resellerPrice = this.coalesceNumber(
      snapshot.priceGross,
      snapshot.priceGrossAlt,
      snapshot.priceNet,
      snapshot.priceNetAlt,
    );

    if (priceNet != null || resellerPrice != null) {
      const data: Prisma.ProductVariantUpdateInput = {};
      if (priceNet != null) data.price = priceNet;
      if (resellerPrice != null) data.resellerPrice = resellerPrice;
      if (Object.keys(data).length) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data,
        });
      }
    }

    if (snapshot.stockQuantity != null) {
      const quantity = this.normalizeQuantity(snapshot.stockQuantity);
      await tx.stock.upsert({
        where: {
          storeId_productVariantId: {
            storeId: store.id,
            productVariantId: variant.id,
          },
        },
        update: { quantity },
        create: {
          storeId: store.id,
          productVariantId: variant.id,
          quantity,
          reserved: 0,
        },
      });
    }

    await this.domainEvents.publish(
      'legacy.price.synced',
      {
        storeId: store.id,
        productVariantId: variant.id,
        snapshotId: snapshot.id,
        identity: snapshot.identity,
        priceNet: snapshot.priceNet,
        priceGross: snapshot.priceGross,
        stockQuantity: snapshot.stockQuantity,
        priceDate: snapshot.priceDate,
      },
      {
        aggregateType: 'ProductVariant',
        aggregateId: variant.id,
        tx,
      },
    );
  }

  private async applyTicket(
    tx: TransactionClient,
    ticket: LegacyTicketRecord,
    cache: ResolutionCache,
  ) {
    const store = await this.resolveStore(tx, ticket.storeCode, cache);
    const lines = await tx.legacyTicketLine.findMany({
      where: { ticketId: ticket.id },
    });
    if (!lines.length) {
      throw new Error(`Ticket ${ticket.identity} has no lines`);
    }

    const aggregated = new Map<string, number>();
    for (const line of lines) {
      const variant = await this.resolveVariant(
        tx,
        {
          articleCode: line.articleCode,
          sizeCode: line.sizeCode ?? null,
          colorCode: line.colorCode ?? null,
        },
        cache,
      );
      const quantity = this.normalizeQuantity(line.quantity);
      if (quantity === 0) continue;
      aggregated.set(variant.id, (aggregated.get(variant.id) ?? 0) + quantity);
    }

    if (!aggregated.size) {
      throw new Error(`Ticket ${ticket.identity} has no quantities to record`);
    }

    const movement = await this.upsertStockMovement(tx, {
      storeId: store.id,
      referenceEntity: 'LegacyTicket',
      referenceId: ticket.identity,
      items: Array.from(aggregated.entries()).map(
        ([productVariantId, quantity]) => ({
          productVariantId,
          quantity,
        }),
      ),
    });

    await this.domainEvents.publish(
      'legacy.ticket.synced',
      {
        ticketId: ticket.id,
        identity: ticket.identity,
        storeId: store.id,
        issuedAt: ticket.issuedAt,
        totalNet: ticket.totalNet,
        stockMovementId: movement.id,
      },
      {
        aggregateType: 'LegacyTicket',
        aggregateId: ticket.id,
        tx,
      },
    );
  }

  private async applyInvoice(
    tx: TransactionClient,
    invoice: LegacyInvoiceRecord,
    cache: ResolutionCache,
  ) {
    const store = await this.resolveStore(tx, invoice.storeCode, cache);
    const lines = await tx.legacyInvoiceLine.findMany({
      where: { invoiceId: invoice.id },
    });

    const aggregated = new Map<string, number>();
    for (const line of lines) {
      const variant = await this.resolveVariant(
        tx,
        {
          articleCode: line.articleCode,
          sizeCode: line.sizeCode ?? null,
          colorCode: line.colorCode ?? null,
        },
        cache,
      );
      const quantity = this.normalizeQuantity(line.quantity);
      if (quantity === 0) continue;
      aggregated.set(variant.id, (aggregated.get(variant.id) ?? 0) + quantity);
    }

    let movementId: string | null = null;
    if (aggregated.size) {
      const movement = await this.upsertStockMovement(tx, {
        storeId: store.id,
        referenceEntity: 'LegacyInvoice',
        referenceId: invoice.identity,
        items: Array.from(aggregated.entries()).map(
          ([productVariantId, quantity]) => ({
            productVariantId,
            quantity,
          }),
        ),
      });
      movementId = movement.id;
    }

    await this.domainEvents.publish(
      'legacy.invoice.synced',
      {
        invoiceId: invoice.id,
        identity: invoice.identity,
        storeId: store.id,
        issuedAt: invoice.issuedAt,
        totalNet: invoice.totalNet,
        stockMovementId: movementId,
      },
      {
        aggregateType: 'LegacyInvoice',
        aggregateId: invoice.id,
        tx,
      },
    );
  }

  private async upsertStockMovement(
    tx: TransactionClient,
    params: {
      storeId: string;
      referenceEntity: string;
      referenceId: string;
      items: Array<{ productVariantId: string; quantity: number }>;
      direction?: MovementDirection;
      movementType?: MovementType;
    },
  ) {
    if (!params.items.length) {
      throw new Error('Cannot create stock movement without items');
    }

    const direction = params.direction ?? MovementDirection.OUT;
    const movementType = params.movementType ?? MovementType.SALE;

    const existing = await tx.stockMovement.findFirst({
      where: {
        referenceEntity: params.referenceEntity,
        referenceId: params.referenceId,
      },
    });

    if (existing) {
      await tx.stockMovementItem.deleteMany({
        where: { stockMovementId: existing.id },
      });
      return tx.stockMovement.update({
        where: { id: existing.id },
        data: {
          storeId: params.storeId,
          direction,
          movementType,
          items: { create: params.items },
        },
      });
    }

    return tx.stockMovement.create({
      data: {
        storeId: params.storeId,
        direction,
        movementType,
        referenceEntity: params.referenceEntity,
        referenceId: params.referenceId,
        items: { create: params.items },
      },
    });
  }

  private async resolveStore(
    tx: TransactionClient,
    storeCode: string,
    cache: ResolutionCache,
  ): Promise<StoreRecord> {
    const cached = cache.stores.get(storeCode);
    if (cached) return cached;

    let store: StoreRecord | null = null;

    const mapping = await tx.legacyStoreMapping.findUnique({
      where: { storeCode },
    });
    if (mapping) {
      store = await tx.store.findUnique({ where: { id: mapping.storeId } });
    }

    if (!store) {
      store = await tx.store.findUnique({ where: { id: storeCode } });
    }

    if (!store) {
      store = await tx.store.findFirst({ where: { name: storeCode } });
    }

    if (!store) {
      throw new Error(`Unable to resolve store for code ${storeCode}`);
    }

    cache.stores.set(storeCode, store);
    return store;
  }

  private async resolveVariant(
    tx: TransactionClient,
    identifiers: {
      articleCode: string;
      sizeCode: string | null;
      colorCode: string | null;
    },
    cache: ResolutionCache,
  ): Promise<VariantRecord> {
    const { articleCode, sizeCode, colorCode } = identifiers;
    const cacheKey = articleCode;
    const cached = cache.variants.get(cacheKey);
    if (cached) return cached;

    let variant: VariantRecord | null = null;

    variant = await tx.productVariant.findUnique({
      where: { legacyArticleCode: articleCode },
    });

    if (!variant) {
      variant = await tx.productVariant.findUnique({
        where: { barcode: articleCode },
      });
    }

    if (!variant) {
      throw new Error(
        `Unable to resolve product variant for article ${articleCode} (size=${sizeCode ?? 'n/a'}, color=${colorCode ?? 'n/a'})`,
      );
    }

    cache.variants.set(cacheKey, variant);
    return variant;
  }

  private coalesceNumber(...values: Array<number | null>): number | null {
    for (const value of values) {
      if (value != null) return value;
    }
    return null;
  }

  private normalizeQuantity(value: number | null | undefined) {
    if (value == null || Number.isNaN(value)) return 0;
    return Math.round(value);
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private async upsertCursor(
    entity: LegacySyncEntity,
    storeCode: string,
    cursor: string,
    tx?: TransactionClient,
  ) {
    if (!cursor) return;
    const client = tx ?? this.prisma;
    await client.legacySyncCursor.upsert({
      where: {
        entity_storeCode: {
          entity,
          storeCode,
        },
      },
      create: {
        entity,
        storeCode,
        cursor,
      },
      update: {
        cursor,
      },
    });
  }

  private groupBy<T>(items: T[], keySelector: (item: T) => string) {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = keySelector(item);
      const collection = map.get(key);
      if (collection) {
        collection.push(item);
      } else {
        map.set(key, [item]);
      }
    }
    return map;
  }

  private pickLargest(
    current: number | null,
    candidate: number | null,
  ): number | null {
    if (candidate == null) return current;
    if (current == null || candidate > current) return candidate;
    return current;
  }

  private buildTicketIdentity(ticket: LegacyTicketDto) {
    return [
      ticket.storeCode,
      ticket.fo ?? '0',
      ticket.serie ?? '',
      ticket.ticketNumber ?? '0',
      ticket.suffix ?? '',
    ].join(':');
  }

  private buildInvoiceIdentity(invoice: LegacyInvoiceDto) {
    return [
      invoice.storeCode,
      invoice.serie ?? '',
      invoice.invoiceNumber ?? '0',
      invoice.suffix ?? '',
    ].join(':');
  }

  private buildPriceIdentity(row: LegacyPriceRowDto, snapshotDate: Date) {
    return [
      row.storeCode,
      row.tariffId,
      row.articleCode,
      row.sizeCode ?? '',
      row.colorCode ?? '',
      row.formatCode ?? '',
      snapshotDate.toISOString(),
      row.warehouseCode,
    ].join(':');
  }
}
