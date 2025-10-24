export declare const fontFamilies: {
    readonly sans: "\"Inter\", \"Helvetica Neue\", Arial, sans-serif";
    readonly mono: "\"Roboto Mono\", \"Fira Code\", monospace";
};
export declare const nativeFontFamilies: {
    readonly sans: "System";
    readonly mono: "Courier";
};
export declare const fontSizes: {
    readonly xs: 12;
    readonly sm: 14;
    readonly md: 16;
    readonly lg: 20;
    readonly xl: 24;
    readonly '2xl': 30;
};
export declare const fontWeights: {
    readonly regular: 400;
    readonly medium: 500;
    readonly semibold: 600;
    readonly bold: 700;
};
export type FontFamilyToken = keyof typeof fontFamilies;
export type NativeFontToken = keyof typeof nativeFontFamilies;
//# sourceMappingURL=typography.d.ts.map