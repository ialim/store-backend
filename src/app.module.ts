import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { PrismaModule } from './common/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { StaffModule } from './modules/staff/staff.module';
import { NotificationModule } from './modules/notification/notification.module';
import { VerificationModule } from './modules/verification/verification.module';
import { CatalogueModule } from './modules/catalogue/catalogue.module';
import { StoreModule } from './modules/store/store.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { StockModule } from './modules/stock/stock.module';
import { SaleModule } from './modules/sale/sale.module';
import { OrderModule } from './modules/order/order.module';
import { EventsModule } from './modules/events/events.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { SupportModule } from './modules/support/support.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      graphiql: process.env.ENV === 'dev',
    }),
    AuthModule,
    CatalogueModule,
    NotificationModule,
    OnboardingModule,
    PurchaseModule,
    PrismaModule,
    StaffModule,
    StockModule,
    SaleModule,
    OrderModule,
    EventsModule,
    PaymentModule,
    ReturnsModule,
    SupportModule,
    StoreModule,
    UsersModule,
    VerificationModule,
  ],
})
export class AppModule {}
