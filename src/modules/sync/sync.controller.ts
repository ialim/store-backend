import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncPricesDto } from './dto/sync-prices.dto';
import { SyncTicketsDto } from './dto/sync-tickets.dto';
import { SyncInvoicesDto } from './dto/sync-invoices.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.service';

type RequestWithUser = Request & { user?: AuthenticatedUser };

@Controller('sync')
@UseGuards(AuthGuard('jwt'))
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  private ensureCanSync(user?: AuthenticatedUser) {
    const roleName = user?.role?.name;
    const hasPrivilegedRole = roleName
      ? ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(roleName)
      : false;
    const hasManageProductsPermission = Boolean(
      user?.role?.permissions?.some(
        (permission) => permission.name === 'MANAGE_PRODUCTS',
      ),
    );
    if (!hasPrivilegedRole && !hasManageProductsPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  @Post('prices')
  async syncPrices(@Body() dto: SyncPricesDto, @Req() req: RequestWithUser) {
    if (!dto?.rows || !Array.isArray(dto.rows)) {
      throw new BadRequestException('rows must be an array');
    }
    this.ensureCanSync(req.user);
    return this.syncService.syncPrices(dto.rows);
  }

  @Post('tickets')
  async syncTickets(@Body() dto: SyncTicketsDto, @Req() req: RequestWithUser) {
    if (!dto?.tickets || !Array.isArray(dto.tickets)) {
      throw new BadRequestException('tickets must be an array');
    }
    this.ensureCanSync(req.user);
    return this.syncService.syncTickets(dto.tickets);
  }

  @Post('invoices')
  async syncInvoices(
    @Body() dto: SyncInvoicesDto,
    @Req() req: RequestWithUser,
  ) {
    if (!dto?.invoices || !Array.isArray(dto.invoices)) {
      throw new BadRequestException('invoices must be an array');
    }
    this.ensureCanSync(req.user);
    return this.syncService.syncInvoices(dto.invoices);
  }
}
