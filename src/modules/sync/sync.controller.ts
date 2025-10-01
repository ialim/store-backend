import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncPricesDto } from './dto/sync-prices.dto';
import { SyncTicketsDto } from './dto/sync-tickets.dto';
import { SyncInvoicesDto } from './dto/sync-invoices.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('prices')
  async syncPrices(@Body() dto: SyncPricesDto) {
    if (!dto?.rows || !Array.isArray(dto.rows)) {
      throw new BadRequestException('rows must be an array');
    }
    return this.syncService.syncPrices(dto.rows);
  }

  @Post('tickets')
  async syncTickets(@Body() dto: SyncTicketsDto) {
    if (!dto?.tickets || !Array.isArray(dto.tickets)) {
      throw new BadRequestException('tickets must be an array');
    }
    return this.syncService.syncTickets(dto.tickets);
  }

  @Post('invoices')
  async syncInvoices(@Body() dto: SyncInvoicesDto) {
    if (!dto?.invoices || !Array.isArray(dto.invoices)) {
      throw new BadRequestException('invoices must be an array');
    }
    return this.syncService.syncInvoices(dto.invoices);
  }
}
