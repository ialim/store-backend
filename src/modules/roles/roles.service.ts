import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoleInput } from './dto/create-role.input';
import { UpdateRoleInput } from './dto/update-role.input';
import { AssignRoleInput } from './dto/assign-role.input';

const LOCKED_ROLE_NAMES = new Set(['SUPERADMIN']);

function normalizeRoleName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, '_');
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    return permissions.map((permission) => ({
      ...permission,
      module: permission.module ?? 'General',
      action:
        permission.action ??
        (permission.name.includes('_')
          ? permission.name.split('_').slice(-1)[0]
          : 'UNKNOWN'),
    }));
  }

  async listRoles() {
    return this.prisma.role.findMany({
      include: { permissions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async resolvePermissionConnections(
    permissionNames: string[] | undefined,
  ) {
    if (!permissionNames) {
      return undefined;
    }
    const uniqueNames = Array.from(
      new Set(permissionNames.map((name) => name.trim()).filter(Boolean)),
    );
    if (!uniqueNames.length) {
      return { set: [], connect: [] };
    }
    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: uniqueNames } },
      select: { id: true, name: true },
    });
    if (permissions.length !== uniqueNames.length) {
      const found = new Set(permissions.map((p) => p.name));
      const missing = uniqueNames.filter((name) => !found.has(name));
      throw new BadRequestException(
        `Unknown permissions: ${missing.join(', ')}`,
      );
    }
    return {
      set: [],
      connect: permissions.map((p) => ({ id: p.id })),
    };
  }

  async createRole(input: CreateRoleInput) {
    if (!input.name?.trim()) {
      throw new BadRequestException('Role name is required');
    }
    const normalizedName = normalizeRoleName(input.name);
    const permissions = await this.resolvePermissionConnections(
      input.permissionNames,
    );

    try {
      return await this.prisma.role.create({
        data: {
          name: normalizedName,
          description: input.description?.trim() || null,
          permissions,
        },
        include: { permissions: true },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          `Role with name ${normalizedName} already exists`,
        );
      }
      throw error;
    }
  }

  async updateRole(roleId: string, input: UpdateRoleInput) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (LOCKED_ROLE_NAMES.has(role.name)) {
      throw new BadRequestException('This role cannot be modified');
    }
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new BadRequestException('Role name cannot be empty');
      }
      updateData.name = normalizeRoleName(input.name);
    }
    if (input.description !== undefined) {
      updateData.description = input.description?.trim() || null;
    }
    if (input.permissionNames !== undefined) {
      updateData.permissions = await this.resolvePermissionConnections(
        input.permissionNames,
      );
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: updateData,
      include: { permissions: true },
    });
  }

  async deleteRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (LOCKED_ROLE_NAMES.has(role.name)) {
      throw new BadRequestException('This role cannot be deleted');
    }
    if (role._count.users > 0) {
      throw new BadRequestException(
        'Cannot delete a role that is assigned to users',
      );
    }
    await this.prisma.role.delete({ where: { id: roleId } });
    return true;
  }

  async assignRole(input: AssignRoleInput) {
    const role = await this.prisma.role.findUnique({
      where: { id: input.roleId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (LOCKED_ROLE_NAMES.has(role.name)) {
      throw new BadRequestException('This role cannot be assigned');
    }
    await this.prisma.user.update({
      where: { id: input.userId },
      data: { roleId: input.roleId },
    });
    return true;
  }
}
