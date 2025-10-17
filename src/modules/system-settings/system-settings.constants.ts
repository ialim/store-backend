import { SystemSettingKey } from './system-settings.types';

export type SystemSettingValueType = 'number' | 'boolean' | 'string';

export type NumberSettingDefinition = {
  key: SystemSettingKey;
  type: 'number';
  defaultValue: number;
  description: string;
  envVar?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  coerce?: (value: number) => number;
};

export type BooleanSettingDefinition = {
  key: SystemSettingKey;
  type: 'boolean';
  defaultValue: boolean;
  description: string;
  envVar?: string;
};

export type StringSettingDefinition = {
  key: SystemSettingKey;
  type: 'string';
  defaultValue: string;
  description: string;
  envVar?: string;
  maxLength?: number;
  pattern?: RegExp;
};

export type SystemSettingDefinition =
  | NumberSettingDefinition
  | BooleanSettingDefinition
  | StringSettingDefinition;

type DefinitionMap = Record<SystemSettingKey, SystemSettingDefinition>;

export const SYSTEM_SETTING_DEFINITIONS: DefinitionMap = {
  SALE_PENDING_EXPIRY_MINUTES: {
    key: 'SALE_PENDING_EXPIRY_MINUTES',
    type: 'number',
    defaultValue: 1440,
    description:
      'Minutes before a pending sale without payment is automatically cancelled.',
    min: 0,
    max: 1440 * 7,
    step: 5,
    envVar: 'SALE_PENDING_EXPIRY_MINUTES',
    integer: true,
  },
  SALE_EXPIRY_BATCH_SIZE: {
    key: 'SALE_EXPIRY_BATCH_SIZE',
    type: 'number',
    defaultValue: 50,
    description:
      'Maximum number of stale sale orders processed per expiry cycle.',
    min: 1,
    max: 500,
    step: 5,
    envVar: 'SALE_EXPIRY_BATCH_SIZE',
    integer: true,
  },
  RIDER_INTEREST_DEFAULT_EXPIRY_MINUTES: {
    key: 'RIDER_INTEREST_DEFAULT_EXPIRY_MINUTES',
    type: 'number',
    defaultValue: 45,
    description:
      'Default minutes before a rider interest without an ETA is considered expired.',
    min: 0,
    max: 240,
    step: 5,
    envVar: 'RIDER_INTEREST_DEFAULT_EXPIRY_MINUTES',
    integer: true,
  },
  RIDER_INTEREST_FALLBACK_EXPIRY_MINUTES: {
    key: 'RIDER_INTEREST_FALLBACK_EXPIRY_MINUTES',
    type: 'number',
    defaultValue: 60,
    description:
      'Minutes before rider interests without explicit expiry are considered stale.',
    min: 0,
    max: 480,
    step: 5,
    envVar: 'RIDER_INTEREST_FALLBACK_EXPIRY_MINUTES',
    integer: true,
  },
  RIDER_INTEREST_EXPIRY_BATCH_SIZE: {
    key: 'RIDER_INTEREST_EXPIRY_BATCH_SIZE',
    type: 'number',
    defaultValue: 50,
    description: 'Maximum rider interests evaluated per expiry cron execution.',
    min: 1,
    max: 500,
    step: 5,
    envVar: 'RIDER_INTEREST_EXPIRY_BATCH_SIZE',
    integer: true,
  },
  CONSUMER_PRICE_MARKUP_PERCENT: {
    key: 'CONSUMER_PRICE_MARKUP_PERCENT',
    type: 'number',
    defaultValue: 0.05,
    description:
      'Markup applied to consumer pricing (expressed as a fraction between 0 and 0.5).',
    min: 0,
    max: 0.5,
    step: 0.01,
    envVar: 'CONSUMER_PRICE_MARKUP_PERCENT',
    coerce: (value: number) =>
      Math.max(0, Math.min(value > 1 ? value / 100 : value, 0.5)),
  },
  ADDRESS_REFRESH_ENABLED: {
    key: 'ADDRESS_REFRESH_ENABLED',
    type: 'boolean',
    defaultValue: true,
    description: 'Toggle automatic geocoding refresh for stored addresses.',
    envVar: 'ADDRESS_REFRESH_ENABLED',
  },
  ADDRESS_REFRESH_BATCH_SIZE: {
    key: 'ADDRESS_REFRESH_BATCH_SIZE',
    type: 'number',
    defaultValue: 20,
    description:
      'Number of addresses refreshed per scheduled geocoding job execution.',
    min: 1,
    max: 200,
    step: 1,
    envVar: 'ADDRESS_REFRESH_BATCH_SIZE',
    integer: true,
  },
  ADDRESS_REFRESH_MAX_AGE_DAYS: {
    key: 'ADDRESS_REFRESH_MAX_AGE_DAYS',
    type: 'number',
    defaultValue: 30,
    description:
      'Addresses older than this number of days will be considered for refresh.',
    min: 1,
    max: 365,
    step: 1,
    envVar: 'ADDRESS_REFRESH_MAX_AGE_DAYS',
    integer: true,
  },
} as const;

export const SYSTEM_SETTING_KEYS = Object.keys(
  SYSTEM_SETTING_DEFINITIONS,
) as SystemSettingKey[];
