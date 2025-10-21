import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import {
  SystemSettingDto,
  SystemSettingKeyEnum,
  SystemSettingValueTypeEnum,
  UpdateSystemSettingInput,
} from './dto/system-setting.dto';
import { SystemSettingsService } from './system-settings.service';
import {
  SYSTEM_SETTING_DEFINITIONS,
  SystemSettingValueType,
} from './system-settings.constants';
import { SystemSettingValue } from './system-settings.types';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';

@Resolver(() => SystemSettingDto)
@UseGuards(GqlAuthGuard, PermissionsGuard)
export class SystemSettingsResolver {
  constructor(private readonly systemSettings: SystemSettingsService) {}

  @Query(() => [SystemSettingDto])
  @Permissions(PERMISSIONS.systemSettings.READ as string)
  async systemSettingsList(): Promise<SystemSettingDto[]> {
    const settings = await this.systemSettings.listSettings();
    return settings.map((setting) => this.toDto(setting));
  }

  @Mutation(() => SystemSettingDto)
  @Permissions(PERMISSIONS.systemSettings.UPDATE as string)
  async updateSystemSetting(
    @Args('input') input: UpdateSystemSettingInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SystemSettingDto> {
    const key = input.key;
    const definition = SYSTEM_SETTING_DEFINITIONS[key];
    if (!definition) {
      throw new BadRequestException(`Unknown setting ${input.key}`);
    }

    if (input.reset) {
      await this.systemSettings.resetSetting(key);
      const settings = await this.systemSettings.listSettings();
      const match = settings.find((s) => s.key === key);
      if (!match) {
        throw new BadRequestException(
          `Unable to resolve setting ${String(input.key)} after reset`,
        );
      }
      return this.toDto(match);
    }

    const valueType = this.mapValueType(definition.type);
    const value = this.resolveInputValue(valueType, input);
    const result = await this.systemSettings.updateSetting(
      key,
      value,
      user?.id ?? null,
    );
    return this.toDto(result);
  }

  private resolveInputValue(
    type: SystemSettingValueTypeEnum,
    input: UpdateSystemSettingInput,
  ): SystemSettingValue {
    switch (type) {
      case SystemSettingValueTypeEnum.NUMBER:
        if (input.numberValue == null) {
          throw new BadRequestException(
            'numberValue is required for numeric settings.',
          );
        }
        return input.numberValue;
      case SystemSettingValueTypeEnum.BOOLEAN:
        if (input.booleanValue == null) {
          throw new BadRequestException(
            'booleanValue is required for boolean settings.',
          );
        }
        return input.booleanValue;
      case SystemSettingValueTypeEnum.STRING:
        if (input.stringValue == null) {
          throw new BadRequestException(
            'stringValue is required for string settings.',
          );
        }
        return input.stringValue;
      default:
        throw new BadRequestException('Unsupported value type');
    }
  }

  private mapValueType(
    valueType: SystemSettingValueType,
  ): SystemSettingValueTypeEnum {
    switch (valueType) {
      case 'number':
        return SystemSettingValueTypeEnum.NUMBER;
      case 'boolean':
        return SystemSettingValueTypeEnum.BOOLEAN;
      case 'string':
        return SystemSettingValueTypeEnum.STRING;
      default:
        throw new BadRequestException('Unknown value type');
    }
  }

  private toDto(
    setting: Awaited<ReturnType<SystemSettingsService['listSettings']>>[number],
  ): SystemSettingDto {
    const dto = new SystemSettingDto();
    dto.key =
      SystemSettingKeyEnum[setting.key as keyof typeof SystemSettingKeyEnum];
    dto.valueType = this.mapValueType(setting.valueType);
    dto.source = setting.source;
    dto.description = setting.description;
    dto.metadata = setting.metadata;
    dto.updatedAt = setting.updatedAt ?? undefined;
    dto.updatedBy = setting.updatedBy
      ? {
          id: setting.updatedBy.id,
          email: setting.updatedBy.email ?? undefined,
          fullName: setting.updatedBy.fullName ?? undefined,
        }
      : undefined;

    if (setting.valueType === 'number') {
      dto.numberValue =
        typeof setting.value === 'number' ? setting.value : null;
      dto.defaultNumberValue =
        typeof setting.defaultValue === 'number' ? setting.defaultValue : null;
      dto.envNumberValue =
        typeof setting.envValue === 'number' ? setting.envValue : null;
    } else if (setting.valueType === 'boolean') {
      dto.booleanValue =
        typeof setting.value === 'boolean' ? setting.value : null;
      dto.defaultBooleanValue =
        typeof setting.defaultValue === 'boolean' ? setting.defaultValue : null;
      dto.envBooleanValue =
        typeof setting.envValue === 'boolean' ? setting.envValue : null;
    } else {
      dto.stringValue =
        typeof setting.value === 'string' ? setting.value : null;
      dto.defaultStringValue =
        typeof setting.defaultValue === 'string' ? setting.defaultValue : null;
      dto.envStringValue =
        typeof setting.envValue === 'string' ? setting.envValue : null;
    }
    return dto;
  }
}
