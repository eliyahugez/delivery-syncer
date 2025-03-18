
import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';
import { cva, type VariantProps } from 'class-variance-authority';

const customButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        glass: "glass hover:shadow-glass-hover",
        neo: "bg-white hover:bg-white/90 text-foreground shadow-neo hover:shadow-none transition-shadow",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "glass",
      size: "default",
    },
  }
);

export interface CustomButtonProps
  extends ButtonProps,
    VariantProps<typeof customButtonVariants> {}

const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    if (variant === 'glass' || variant === 'neo') {
      return (
        <button
          className={cn(customButtonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      );
    }
    
    // Fall back to the default Button component for other variants
    return <Button className={className} variant={variant} size={size} ref={ref} {...props} />;
  }
);

CustomButton.displayName = 'CustomButton';

export { CustomButton };
