import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SsoClientModule } from '../../common/sso-client/sso-client.module';

@Module({
  imports: [NotificationsModule, SsoClientModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
