
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

// Create a type for our custom variants
export type CustomButtonVariant = 'glass' | 'neo';

// Define the props for our custom button
export interface CustomButtonProps 
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof customButtonVariants> {
  asChild?: boolean;
}

const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    // Check if we're using one of our custom variants
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
    return (
      <Button 
        className={className} 
        // Type assertion to work around type incompatibility
        variant={variant as any} 
        size={size as any} 
        ref={ref} 
        {...props} 
      />
    );
  }
);

CustomButton.displayName = 'CustomButton';

export { CustomButton, customButtonVariants };
