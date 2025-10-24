import { ViewProps } from 'react-native';
import { spacing } from '@store/design-tokens';
export type CardProps = ViewProps & {
    padding?: keyof typeof spacing;
};
export declare function Card({ style, padding, ...viewProps }: CardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Card.d.ts.map