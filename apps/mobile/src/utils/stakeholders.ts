import {
  STAKEHOLDER_TYPES,
  type StakeholderType,
} from '@store/mobile-shared';

const ROLE_TO_STAKEHOLDER = new Map<string, StakeholderType>([
  ['RESELLER', 'RESELLER'],
  ['RIDER', 'RIDER'],
  ['BILLER', 'BILLER'],
  ['MANAGER', 'MANAGER'],
  ['SUPERADMIN', 'MANAGER'],
]);

export function roleToStakeholder(roleName?: string | null): StakeholderType | null {
  if (!roleName) return null;
  return ROLE_TO_STAKEHOLDER.get(roleName.toUpperCase()) ?? null;
}

export function listStakeholders(): StakeholderType[] {
  return [...STAKEHOLDER_TYPES];
}
