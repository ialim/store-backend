import type { JSX } from 'react';
import { ButtonBaseProps } from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
export type ListItemProps = Omit<ButtonBaseProps, 'children'> & {
    title: string;
    description?: string;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    elevated?: boolean;
    titleProps?: Partial<React.ComponentProps<typeof Typography>>;
    descriptionProps?: Partial<React.ComponentProps<typeof Typography>>;
};
export declare function ListItem({ title, description, leading, trailing, elevated, disabled, titleProps, descriptionProps, sx, ...props }: ListItemProps): JSX.Element;
//# sourceMappingURL=ListItem.d.ts.map