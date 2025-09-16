import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'changeme',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [
    AuthService,
    AuthResolver,
    PrismaService,
    GqlAuthGuard,
    RolesGuard,
    JwtStrategy,
  ],
  exports: [GqlAuthGuard, RolesGuard],
})
export class AuthModule {}
