import * as React from "react";

type BadgeProps =
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "outline";
  };

function Badge({
  className = "",
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={[
        "inline-flex items-center rounded-full text-xs font-medium",
        variant === "outline"
          ? "border bg-transparent"
          : "border-transparent bg-foreground text-background",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export { Badge };
