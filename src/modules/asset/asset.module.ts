import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetResolver } from './asset.resolver';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AssetsController } from './assets.controller';
import { AssetStorageService } from './asset-storage.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [AssetService, AssetResolver, AssetStorageService, PrismaService],
  controllers: [AssetsController],
  exports: [AssetService],
})
export class AssetModule {}
