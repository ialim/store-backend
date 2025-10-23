export type PermissionName = string;
export declare const STAKEHOLDER_TYPES: readonly ["RESELLER", "RIDER", "BILLER", "MANAGER"];
export type StakeholderType = (typeof STAKEHOLDER_TYPES)[number];
type CapabilityDefinition = {
    required: PermissionName[];
    optional?: PermissionName[];
    description: string;
};
export declare const STAKEHOLDER_CAPABILITIES: Record<StakeholderType, CapabilityDefinition>;
export declare function getStakeholderPermissions(stakeholder: StakeholderType, options?: {
    includeOptional?: boolean;
}): PermissionName[];
export declare function describeStakeholder(stakeholder: StakeholderType): string;
export {};
//# sourceMappingURL=capabilities.d.ts.map