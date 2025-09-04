import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private logger = new Logger(SmsService.name);

  async sendSms(to: string, message: string) {
    // Integrate with Twilio or similar provider
    this.logger.log(`Sending SMS to ${to}: ${message}`);
  }
}
