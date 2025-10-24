export const STAKEHOLDER_TYPES = [
    'RESELLER',
    'RIDER',
    'BILLER',
    'MANAGER',
];
export const STAKEHOLDER_CAPABILITIES = {
    RESELLER: {
        required: [
            'SALE_CREATE',
            'SALE_READ',
            'SALE_UPDATE',
            'ORDER_READ',
            'PAYMENT_READ',
            'ASSET_CREATE',
        ],
        optional: ['RETURN_CREATE', 'RETURN_READ', 'RETURN_UPDATE'],
        description: 'Captures orders and payments in the field; manages their own catalogue assets.',
    },
    RIDER: {
        required: ['ORDER_READ', 'ORDER_UPDATE', 'ADDRESS_READ'],
        optional: ['UPLOADS_CREATE'],
        description: 'Handles assigned fulfilments, updates delivery statuses, and references drop-off addresses.',
    },
    BILLER: {
        required: ['PAYMENT_READ', 'ORDER_READ', 'SALE_READ', 'PURCHASE_READ'],
        optional: ['SALE_APPROVE', 'RETURN_READ'],
        description: 'Reviews orders, reconciles payments, and checks associated purchase activity.',
    },
    MANAGER: {
        required: [
            'ANALYTICS_READ',
            'SALE_READ',
            'SALE_APPROVE',
            'ORDER_APPROVE',
            'SUPPORT_READ',
            'SYSTEM_SETTINGS_READ',
        ],
        optional: ['ORDER_READ', 'PAYMENT_READ', 'RETURN_READ', 'EVENT_READ'],
        description: 'Monitors business performance, approves escalations, and accesses support information.',
    },
};
export function getStakeholderPermissions(stakeholder, options = {}) {
    const definition = STAKEHOLDER_CAPABILITIES[stakeholder];
    const base = new Set(definition.required);
    if (options.includeOptional !== false && definition.optional) {
        definition.optional.forEach((permission) => base.add(permission));
    }
    return Array.from(base);
}
export function describeStakeholder(stakeholder) {
    return STAKEHOLDER_CAPABILITIES[stakeholder].description;
}
//# sourceMappingURL=capabilities.js.map