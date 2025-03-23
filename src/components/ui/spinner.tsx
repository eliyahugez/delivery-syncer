
import React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`animate-spin rounded-full border-2 border-current border-t-transparent h-4 w-4 ${className}`}
        {...props}
        aria-label="loading"
      />
    );
  }
);

Spinner.displayName = "Spinner";
