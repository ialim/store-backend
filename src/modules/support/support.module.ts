import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportResolver } from './support.resolver';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  providers: [SupportService, SupportResolver],
})
export class SupportModule {}

