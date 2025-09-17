import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

type CrudDelegate<
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
> = {
  findFirst(args: FindFirstArg): Promise<T | null>;
  findUnique(args: FindUniqueArg): Promise<T | null>;
  findMany(args: FindManyArg): Promise<T[]>;
  groupBy(args: GroupByArg): Promise<unknown>;
  aggregate(args: AggregateArg): Promise<unknown>;
  create(args: CreateArg): Promise<T>;
  createMany(args: CreateManyArg): Promise<unknown>;
  update(args: UpdateArg): Promise<T>;
  updateMany(args: UpdatedManyArg): Promise<unknown>;
  delete(args: DeleteArg): Promise<T>;
  deleteMany(args: DeleteManyArg): Promise<unknown>;
};

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
      const delegate = this.getDelegate();
      const sanitizedArgs = this.normalizeWhere(args);
      return await delegate.findFirst(sanitizedArgs);
    } catch {
      return null;
    }
  }
  findUnique(args: FindUniqueArg): Promise<T | null> {
    const delegate = this.getDelegate();
    const sanitizedArgs = this.normalizeWhere(args);
    return delegate.findUnique(sanitizedArgs);
  }

  findMany(args: FindManyArg): Promise<T[]> {
    const delegate = this.getDelegate();
    const sanitizedArgs = this.normalizeWhere(args);
    return delegate.findMany(sanitizedArgs);
  }

  groupBy(args: GroupByArg) {
    const delegate = this.getDelegate();
    const sanitizedArgs = this.normalizeWhere(args);
    return delegate.groupBy(sanitizedArgs);
  }

  aggregate(args: AggregateArg) {
    const delegate = this.getDelegate();
    const sanitizedArgs = this.normalizeWhere(args);
    return delegate.aggregate(sanitizedArgs);
  }

  create(args: CreateArg): Promise<T> {
    const delegate = this.getDelegate();
    return delegate.create(args);
  }

  createMany(args: CreateManyArg) {
    const delegate = this.getDelegate();
    return delegate.createMany(args);
  }

  update(args: UpdateArg): Promise<T> {
    const delegate = this.getDelegate();
    return delegate.update(args);
  }

  updateMany(args: UpdatedManyArg) {
    const delegate = this.getDelegate();
    return delegate.updateMany(args);
  }

  delete(args: DeleteArg): Promise<T> {
    const delegate = this.getDelegate();
    return delegate.delete(args);
  }

  deleteMany(args: DeleteManyArg) {
    const delegate = this.getDelegate();
    return delegate.deleteMany(args);
  }
  private getModelKey(): string {
    const name = this.constructor.name.replace('Service', '');
    return name.charAt(0).toLowerCase() + name.slice(1);
  }
  private getDelegate(): CrudDelegate<
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
    DeleteManyArg
  > {
    const key = this.getModelKey();
    const delegate = (this.prisma as unknown as Record<string, unknown>)[key];
    if (!delegate) {
      throw new Error(`Delegate ${key} not found on PrismaService`);
    }
    return delegate as CrudDelegate<
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
      DeleteManyArg
    >;
  }

  private normalizeWhere<A>(args: A): A {
    if (!args || typeof args !== 'object') {
      return args;
    }
    const record = args as Record<string, unknown>;
    if (
      Object.prototype.hasOwnProperty.call(record, 'where') &&
      record.where === null
    ) {
      const clone: Record<string, unknown> = { ...record };
      delete clone.where;
      return clone as unknown as A;
    }
    return args;
  }
}
