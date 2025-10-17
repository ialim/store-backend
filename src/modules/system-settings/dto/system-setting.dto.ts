import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';
import { registerEnumType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  SystemSettingKey,
  SystemSettingValueSource,
} from '../system-settings.types';
import { SystemSettingValueType } from '../system-settings.constants';

export enum SystemSettingKeyEnum {
  SALE_PENDING_EXPIRY_MINUTES = 'SALE_PENDING_EXPIRY_MINUTES',
  SALE_EXPIRY_BATCH_SIZE = 'SALE_EXPIRY_BATCH_SIZE',
  RIDER_INTEREST_DEFAULT_EXPIRY_MINUTES = 'RIDER_INTEREST_DEFAULT_EXPIRY_MINUTES',
  RIDER_INTEREST_FALLBACK_EXPIRY_MINUTES = 'RIDER_INTEREST_FALLBACK_EXPIRY_MINUTES',
  RIDER_INTEREST_EXPIRY_BATCH_SIZE = 'RIDER_INTEREST_EXPIRY_BATCH_SIZE',
  CONSUMER_PRICE_MARKUP_PERCENT = 'CONSUMER_PRICE_MARKUP_PERCENT',
  ADDRESS_REFRESH_ENABLED = 'ADDRESS_REFRESH_ENABLED',
  ADDRESS_REFRESH_BATCH_SIZE = 'ADDRESS_REFRESH_BATCH_SIZE',
  ADDRESS_REFRESH_MAX_AGE_DAYS = 'ADDRESS_REFRESH_MAX_AGE_DAYS',
}

registerEnumType(SystemSettingKeyEnum, {
  name: 'SystemSettingKey',
});

export enum SystemSettingValueTypeEnum {
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  STRING = 'string',
}

registerEnumType(SystemSettingValueTypeEnum, {
  name: 'SystemSettingValueType',
});

export enum SystemSettingValueSourceEnum {
  DATABASE = 'DATABASE',
  ENVIRONMENT = 'ENVIRONMENT',
  DEFAULT = 'DEFAULT',
}

registerEnumType(SystemSettingValueSourceEnum, {
  name: 'SystemSettingValueSource',
});

@ObjectType()
export class SystemSettingUserSummary {
  @Field()
  id!: string;

  @Field(() => String, { nullable: true })
  email?: string | null;

  @Field(() => String, { nullable: true })
  fullName?: string | null;
}

@ObjectType()
export class SystemSettingDto {
  @Field(() => SystemSettingKeyEnum)
  key!: SystemSettingKey;

  @Field(() => SystemSettingValueTypeEnum)
  valueType!: SystemSettingValueType;

  @Field(() => Float, { nullable: true })
  numberValue?: number | null;

  @Field(() => String, { nullable: true })
  stringValue?: string | null;

  @Field(() => Boolean, { nullable: true })
  booleanValue?: boolean | null;

  @Field(() => Float, { nullable: true })
  defaultNumberValue?: number | null;

  @Field(() => String, { nullable: true })
  defaultStringValue?: string | null;

  @Field(() => Boolean, { nullable: true })
  defaultBooleanValue?: boolean | null;

  @Field(() => Float, { nullable: true })
  envNumberValue?: number | null;

  @Field(() => String, { nullable: true })
  envStringValue?: string | null;

  @Field(() => Boolean, { nullable: true })
  envBooleanValue?: boolean | null;

  @Field()
  description!: string;

  @Field(() => SystemSettingValueSourceEnum)
  source!: SystemSettingValueSource;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field(() => Date, { nullable: true })
  updatedAt?: Date | null;

  @Field(() => SystemSettingUserSummary, { nullable: true })
  updatedBy?: SystemSettingUserSummary | null;
}

@InputType()
export class UpdateSystemSettingInput {
  @Field(() => SystemSettingKeyEnum)
  key!: SystemSettingKey;

  @Field(() => Float, { nullable: true })
  numberValue?: number;

  @Field(() => String, { nullable: true })
  stringValue?: string;

  @Field(() => Boolean, { nullable: true })
  booleanValue?: boolean;

  @Field(() => Boolean, { nullable: true })
  reset?: boolean;
}
