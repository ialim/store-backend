import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_KEYS,
  SystemSettingDefinition,
  SystemSettingValueType,
} from './system-settings.constants';
import {
  SystemSettingKey,
  SystemSettingValue,
  SystemSettingValueSource,
} from './system-settings.types';

type CacheEntry = {
  value: SystemSettingValue;
  source: SystemSettingValueSource;
  expiresAt: number;
};

export type ResolvedSystemSetting = {
  key: SystemSettingKey;
  valueType: SystemSettingValueType;
  value: SystemSettingValue;
  defaultValue: SystemSettingValue;
  envValue?: SystemSettingValue;
  source: SystemSettingValueSource;
  description: string;
  metadata?: Record<string, unknown>;
  updatedAt?: Date | null;
  updatedBy?: {
    id: string;
    email?: string | null;
    fullName?: string | null;
  } | null;
};

@Injectable()
export class SystemSettingsService {
  private readonly cache = new Map<SystemSettingKey, CacheEntry>();
  private readonly cacheTtlMs = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async listSettings(): Promise<ResolvedSystemSetting[]> {
    const records = await this.prisma.systemSetting.findMany({
      include: {
        updatedBy: {
          select: {
            id: true,
            email: true,
            customerProfile: { select: { fullName: true } },
          },
        },
      },
    });
    const map = new Map<SystemSettingKey, (typeof records)[number]>();
    for (const record of records) {
      map.set(record.key as SystemSettingKey, record);
    }
    return SYSTEM_SETTING_KEYS.map((key) =>
      this.resolveSettingTuple(key, map.get(key)),
    );
  }

  async getNumber(key: SystemSettingKey): Promise<number> {
    const def = this.getDefinition(key);
    if (def.type !== 'number') {
      throw new BadRequestException(
        `Setting ${key} is not a numeric configuration.`,
      );
    }
    const value = await this.getValue(key, def);
    return value as number;
  }

  async getBoolean(key: SystemSettingKey): Promise<boolean> {
    const def = this.getDefinition(key);
    if (def.type !== 'boolean') {
      throw new BadRequestException(
        `Setting ${key} is not a boolean configuration.`,
      );
    }
    const value = await this.getValue(key, def);
    return value as boolean;
  }

  async getValue(
    key: SystemSettingKey,
    def = this.getDefinition(key),
  ): Promise<SystemSettingValue> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    const record = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    const envValue = this.getEnvValue(def);
    let resolvedValue: SystemSettingValue;
    let source: SystemSettingValueSource;
    if (record) {
      resolvedValue = this.parseStoredValue(def, record.value);
      source = 'DATABASE';
    } else if (envValue !== undefined) {
      resolvedValue = envValue;
      source = 'ENVIRONMENT';
    } else {
      resolvedValue = def.defaultValue;
      source = 'DEFAULT';
    }
    this.cache.set(key, {
      value: resolvedValue,
      source,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
    return resolvedValue;
  }

  async updateSetting(
    key: SystemSettingKey,
    value: SystemSettingValue,
    updatedById: string | null,
  ): Promise<ResolvedSystemSetting> {
    const def = this.getDefinition(key);
    const normalized = this.normalizeValue(def, value);
    const data: Prisma.SystemSettingUpsertArgs['create'] = {
      key,
      value: this.serializeValue(def, normalized),
      description: def.description,
      updatedById: updatedById ?? undefined,
    };
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: data,
      update: {
        value: data.value,
        description: data.description,
        updatedById: data.updatedById,
      },
    });
    this.cache.set(key, {
      value: normalized,
      source: 'DATABASE',
      expiresAt: Date.now() + this.cacheTtlMs,
    });
    const record = await this.prisma.systemSetting.findUnique({
      where: { key },
      include: {
        updatedBy: {
          select: {
            id: true,
            email: true,
            customerProfile: { select: { fullName: true } },
          },
        },
      },
    });
    return this.resolveSettingTuple(key, record ?? null);
  }

  async resetSetting(key: SystemSettingKey): Promise<void> {
    await this.prisma.systemSetting
      .delete({
        where: { key },
      })
      .catch(() => undefined);
    this.cache.delete(key);
  }

  private getDefinition(key: SystemSettingKey): SystemSettingDefinition {
    const definition = SYSTEM_SETTING_DEFINITIONS[key];
    if (!definition) {
      throw new BadRequestException(`Unknown system setting: ${key}`);
    }
    return definition;
  }

  private normalizeValue(
    def: SystemSettingDefinition,
    value: SystemSettingValue,
  ): SystemSettingValue {
    if (value === null || value === undefined) {
      throw new BadRequestException('Value is required for this setting.');
    }
    switch (def.type) {
      case 'number': {
        if (typeof value !== 'number') {
          throw new BadRequestException('Expected numeric value.');
        }
        if (Number.isNaN(value) || !Number.isFinite(value)) {
          throw new BadRequestException('Numeric value is not finite.');
        }
        const coerced =
          typeof def.coerce === 'function' ? def.coerce(value) : value;
        const validated = def.integer ? Math.round(coerced) : coerced;
        if (def.min != null && validated < def.min) {
          throw new BadRequestException(
            `Value must be greater than or equal to ${def.min}.`,
          );
        }
        if (def.max != null && validated > def.max) {
          throw new BadRequestException(
            `Value must be less than or equal to ${def.max}.`,
          );
        }
        return validated;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          throw new BadRequestException('Expected boolean value.');
        }
        return value;
      }
      case 'string': {
        if (typeof value !== 'string') {
          throw new BadRequestException('Expected string value.');
        }
        if (def.maxLength && value.length > def.maxLength) {
          throw new BadRequestException(
            `Value cannot exceed ${def.maxLength} characters.`,
          );
        }
        if (def.pattern && !def.pattern.test(value)) {
          throw new BadRequestException(
            'Value does not match required format.',
          );
        }
        return value;
      }
      default:
        throw new BadRequestException('Unsupported setting type.');
    }
  }

  private serializeValue(
    def: SystemSettingDefinition,
    value: SystemSettingValue,
  ): string {
    switch (def.type) {
      case 'number':
        return String(value);
      case 'boolean':
        return value ? 'true' : 'false';
      case 'string':
        return value as string;
      default:
        return String(value ?? '');
    }
  }

  private parseStoredValue(
    def: SystemSettingDefinition,
    value: string,
  ): SystemSettingValue {
    switch (def.type) {
      case 'number': {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) {
          throw new Error(`Stored value for ${def.key} is not numeric.`);
        }
        const coerced =
          typeof def.coerce === 'function' ? def.coerce(parsed) : parsed;
        return def.integer ? Math.round(coerced) : coerced;
      }
      case 'boolean':
        return value === 'true';
      case 'string':
        return value;
      default:
        return value;
    }
  }

  private getEnvValue(
    def: SystemSettingDefinition,
  ): SystemSettingValue | undefined {
    const envVar = def.envVar ?? def.key;
    const rawValue = process.env[envVar];
    if (rawValue === undefined || rawValue === '') {
      return undefined;
    }
    try {
      switch (def.type) {
        case 'number': {
          const parsed = Number.parseFloat(rawValue);
          if (!Number.isFinite(parsed)) return undefined;
          const coerced =
            typeof def.coerce === 'function' ? def.coerce(parsed) : parsed;
          const validated = def.integer ? Math.round(coerced) : coerced;
          if (def.min != null && validated < def.min) return undefined;
          if (def.max != null && validated > def.max) return undefined;
          return validated;
        }
        case 'boolean':
          return ['true', '1', 'yes', 'on'].includes(rawValue.toLowerCase());
        case 'string':
          if (def.maxLength && rawValue.length > def.maxLength) {
            return rawValue.slice(0, def.maxLength);
          }
          if (def.pattern && !def.pattern.test(rawValue)) {
            return undefined;
          }
          return rawValue;
        default:
          return rawValue;
      }
    } catch {
      return undefined;
    }
  }

  private resolveSettingTuple(
    key: SystemSettingKey,
    record:
      | Prisma.SystemSettingGetPayload<{
          include: {
            updatedBy: {
              select: {
                id: true;
                email: true;
                customerProfile: { select: { fullName: true } };
              };
            };
          };
        }>
      | null
      | undefined,
  ): ResolvedSystemSetting {
    const definition = this.getDefinition(key);
    const envValue = this.getEnvValue(definition);
    let value: SystemSettingValue;
    let source: SystemSettingValueSource;
    if (record) {
      value = this.parseStoredValue(definition, record.value);
      source = 'DATABASE';
    } else if (envValue !== undefined) {
      value = envValue;
      source = 'ENVIRONMENT';
    } else {
      value = definition.defaultValue;
      source = 'DEFAULT';
    }

    const metadata: Record<string, unknown> = {};
    if (definition.type === 'number') {
      if (definition.min != null) metadata.min = definition.min;
      if (definition.max != null) metadata.max = definition.max;
      if (definition.step != null) metadata.step = definition.step;
      if (definition.integer) metadata.integer = true;
    }

    return {
      key,
      valueType: definition.type,
      value,
      defaultValue: definition.defaultValue,
      envValue,
      description: definition.description,
      metadata: Object.keys(metadata).length ? metadata : undefined,
      source,
      updatedAt: record?.updatedAt,
      updatedBy: record?.updatedBy
        ? {
            id: record.updatedBy.id,
            email: record.updatedBy.email,
            fullName: record.updatedBy.customerProfile?.fullName ?? null,
          }
        : null,
    };
  }
}
