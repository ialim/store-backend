import {
  Resolver,
  Query,
  Mutation,
  Args,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ObjectType()
export class OrphanVariantDiagnostic {
  @Field(() => String)
  id!: string;
  @Field(() => String, { nullable: true })
  productId?: string | null;
  @Field(() => Boolean)
  productExists!: boolean;
  @Field(() => String, { nullable: true })
  barcode?: string | null;
  @Field(() => String)
  size!: string;
  @Field(() => String)
  concentration!: string;
  @Field(() => String)
  packaging!: string;
}

@Resolver()
export class CatalogueDiagnosticsResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => [OrphanVariantDiagnostic], {
    description:
      'List product variants whose product linkage is invalid or missing',
  })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  async variantsWithInvalidProducts(): Promise<OrphanVariantDiagnostic[]> {
    // Pull a lightweight projection of variants
    const variants = await this.prisma.productVariant.findMany({
      select: {
        id: true,
        productId: true,
        barcode: true,
        size: true,
        concentration: true,
        packaging: true,
      },
    });
    const ids = Array.from(
      new Set(variants.map((v) => v.productId).filter(Boolean)),
    ) as string[];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const existing = new Set(products.map((p) => p.id));
    const invalid = variants.filter(
      (v) => !v.productId || !existing.has(v.productId),
    );
    return invalid.map((v) => ({
      id: v.id,
      productId: v.productId ?? null,
      productExists: Boolean(v.productId && existing.has(v.productId)),
      barcode: v.barcode ?? null,
      size: v.size,
      concentration: v.concentration,
      packaging: v.packaging,
    }));
  }

  @Mutation(() => Boolean, {
    description: 'Attach a variant to a product by setting productId',
  })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  async attachVariantToProduct(
    @Args('variantId') variantId: string,
    @Args('productId') productId: string,
  ): Promise<boolean> {
    // Validate product exists
    const prod = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!prod) throw new Error('Target product not found');
    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { productId },
    });
    return true;
  }
}
