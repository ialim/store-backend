import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/health')
  health() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Get('/ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', ts: new Date().toISOString() };
    } catch (e: unknown) {
      return {
        status: 'degraded',
        error: (e as { message?: string })?.message || String(e),
        ts: new Date().toISOString(),
      };
    }
  }
}
