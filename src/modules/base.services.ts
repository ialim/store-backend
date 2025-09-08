import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class BaseCrudService<
  T,
  FindFirstArg,
  FindUniqueArg,
  FindManyArg,
  GroupByArg,
  AggregateArg,
  CreateArg,
  CreateManyArg,
  UpdateArg,
  UpdatedManyArg,
  DeleteArg,
  DeleteManyArg,
> {
  constructor(public prisma: PrismaService) {}

  async findFirst(args: FindFirstArg): Promise<T | null> {
    try {
      return await (this.getDelegate()).findFirst(args as any);
    } catch (e) {
      return null;
    }
  }
  findUnique(args: FindUniqueArg): Promise<T | null> {
    return (this.getDelegate()).findUnique(args as any);
  }

  findMany(args: FindManyArg): Promise<T[]> {
    return (this.getDelegate()).findMany(args as any);
  }

  groupBy(args: GroupByArg) {
    return (this.getDelegate()).groupBy(args as any);
  }

  aggregate(args: AggregateArg) {
    return (this.getDelegate()).aggregate(args as any);
  }

  create(args: CreateArg): Promise<T> {
    return (this.getDelegate()).create(args as any);
  }

  createMany(args: CreateManyArg) {
    return (this.getDelegate()).createMany(args as any);
  }

  update(args: UpdateArg): Promise<T> {
    return (this.getDelegate()).update(args as any);
  }

  updateMany(args: UpdatedManyArg): Promise<T[]> {
    return (this.getDelegate()).updateMany(args as any);
  }

  delete(args: DeleteArg): Promise<T> {
    return (this.getDelegate()).delete(args as any);
  }

  deleteMany(args: DeleteManyArg): Promise<T[]> {
    return (this.getDelegate()).deleteMany(args as any);
  }
  private getModelKey(): string {
    const name = this.constructor.name.replace('Service', '');
    return name.charAt(0).toLowerCase() + name.slice(1);
  }
  private getDelegate(): any {
    return (this.prisma as any)[this.getModelKey()];
  }
}
