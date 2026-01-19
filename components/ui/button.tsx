import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none " +
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 " +
  "focus-visible:shadow-[0_0_0_2px_rgba(0,0,0,0.1),0_0_0_4px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.15)] " +
  "dark:focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.5),0_0_8px_hsl(var(--ring)/0.4)] " +
  "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 
          "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/80 " +
          "focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 " +
          "dark:bg-destructive/60 dark:hover:bg-destructive/70 dark:active:bg-destructive/80",
        outline:
          "border bg-background shadow-xs " +
          "hover:bg-accent hover:text-accent-foreground hover:border-accent " +
          "active:bg-accent/90 active:text-accent-foreground active:border-accent " +
          "dark:bg-input/30 dark:border-input dark:hover:bg-input/50 dark:hover:border-accent " +
          "dark:active:bg-input/60 dark:active:border-accent",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-accent/90 active:text-accent-foreground " +
          "dark:hover:bg-accent/50 dark:active:bg-accent/60",
        link: 
          "text-primary underline-offset-4 hover:underline active:text-primary/80 " +
          "dark:active:text-primary/70",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
