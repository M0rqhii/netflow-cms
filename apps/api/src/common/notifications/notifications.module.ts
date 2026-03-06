import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailTemplateService } from './email-template.service';
import { AccountNotificationsService } from './account-notifications.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailTemplateService, AccountNotificationsService],
  exports: [EmailTemplateService, AccountNotificationsService],
})
export class NotificationsModule {}
