import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  ProviderConsumerPaymentPayload,
  ProviderResellerPaymentPayload,
} from './dto/provider-webhook.dto';

@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(private readonly payments: PaymentService) {}

  @Post(':provider/consumer')
  @HttpCode(HttpStatus.OK)
  async handleConsumerWebhook(
    @Param('provider') provider: string,
    @Body() raw: unknown,
    @Headers('x-webhook-secret') secret?: string,
  ) {
    this.verifySecret(secret);
    const payload = this.parseConsumerPayload(raw);
    await this.payments.handleConsumerPaymentWebhook({ provider, ...payload });
    return { status: 'ok' };
  }

  @Post(':provider/reseller')
  @HttpCode(HttpStatus.OK)
  async handleResellerWebhook(
    @Param('provider') provider: string,
    @Body() raw: unknown,
    @Headers('x-webhook-secret') secret?: string,
  ) {
    this.verifySecret(secret);
    const payload = this.parseResellerPayload(raw);
    await this.payments.handleResellerPaymentWebhook({ provider, ...payload });
    return { status: 'ok' };
  }

  private verifySecret(secret?: string) {
    const expected = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!expected) {
      return;
    }
    if (!secret || secret !== expected) {
      throw new BadRequestException('Invalid webhook secret');
    }
  }

  private parseConsumerPayload(raw: unknown): ProviderConsumerPaymentPayload {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException('Invalid payload');
    }
    const payload = raw as Record<string, unknown>;
    const saleOrderId = this.ensureString(payload.saleOrderId, 'saleOrderId');
    const consumerSaleId = this.ensureString(
      payload.consumerSaleId,
      'consumerSaleId',
    );
    const method = this.ensureString(payload.method, 'method');
    const status = this.ensureString(payload.status, 'status');
    const amount = this.ensureNumber(payload.amount, 'amount');
    const reference = this.optionalString(payload.reference);
    return { saleOrderId, consumerSaleId, amount, method, status, reference };
  }

  private parseResellerPayload(raw: unknown): ProviderResellerPaymentPayload {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException('Invalid payload');
    }
    const payload = raw as Record<string, unknown>;
    const saleOrderId = this.ensureString(payload.saleOrderId, 'saleOrderId');
    const resellerId = this.ensureString(payload.resellerId, 'resellerId');
    const method = this.ensureString(payload.method, 'method');
    const status = this.ensureString(payload.status, 'status');
    const amount = this.ensureNumber(payload.amount, 'amount');
    const resellerSaleId = this.optionalString(payload.resellerSaleId);
    const reference = this.optionalString(payload.reference);
    const receivedById = this.optionalString(payload.receivedById);
    return {
      saleOrderId,
      resellerId,
      resellerSaleId,
      amount,
      method,
      reference,
      status,
      receivedById,
    };
  }

  private ensureString(value: unknown, field: string): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    throw new BadRequestException(`Invalid ${field}`);
  }

  private optionalString(value: unknown): string | undefined {
    if (value == null) return undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    throw new BadRequestException('Invalid string field in payload');
  }

  private ensureNumber(value: unknown, field: string): number {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return num;
  }
}
