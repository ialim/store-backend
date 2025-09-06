import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Stock } from '../../shared/prismagraphql/stock';
import { StockMovement } from '../../shared/prismagraphql/stock-movement';
import { StockService } from './stock.service';
import { QueryStockInput } from './dto/query-stock.input';
import { ReceiveStockBatchInput } from './dto/receive-stock-batch.input';
import { TransferStockInput } from './dto/transfer-stock.input';
import { StockReceiptBatch } from '../../shared/prismagraphql/stock-receipt-batch';
import { StockTransfer } from '../../shared/prismagraphql/stock-transfer';
import { SetReorderSettingsInput } from './dto/set-reorder-settings.input';

@Resolver()
export class StockResolver {
  constructor(private readonly stockService: StockService) {}

  @Query(() => [Stock])
  @UseGuards(GqlAuthGuard)
  async stock(@Args('input', { nullable: true }) input?: QueryStockInput) {
    return this.stockService.queryStock(
      input?.storeId,
      input?.productVariantId,
    );
  }

  @Query(() => [StockMovement])
  @UseGuards(GqlAuthGuard)
  async stockMovements(@Args('storeId') storeId: string) {
    return this.stockService.listMovements(storeId);
  }

  @Mutation(() => StockReceiptBatch)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  async receiveStockBatch(@Args('input') input: ReceiveStockBatchInput) {
    return this.stockService.receiveStockBatch(input);
  }

  @Mutation(() => StockTransfer)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  async transferStock(@Args('input') input: TransferStockInput) {
    return this.stockService.transferStock(input);
  }

  @Mutation(() => Stock)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  async setReorderSettings(@Args('input') input: SetReorderSettingsInput) {
    return this.stockService.setReorderSettings(input);
  }
}
