import { tv } from 'tailwind-variants'

const buttonBase = [
  'inline-flex items-center justify-center gap-1.5 rounded-control font-semibold whitespace-nowrap',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  'transition-colors duration-200 outline-none focus-visible:ring-3',
  'disabled:pointer-events-none disabled:bg-disabled-background disabled:text-disabled-foreground disabled:opacity-100',
  'data-disabled:pointer-events-none data-disabled:bg-disabled-background data-disabled:text-disabled-foreground data-disabled:opacity-100',
  'aria-invalid:border-error aria-invalid:focus-visible:ring-error/40',
]

const buttonVariantStyles = {
  default:
    'bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-outline',
  primary:
    'bg-primary-strong text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed focus-visible:ring-outline',
  /* Compatibility name: the shared primary action, without decorative lift. */
  neon: [
    'bg-primary-strong text-primary-foreground active:bg-primary-pressed',
    'hover:bg-primary-hover focus-visible:ring-outline',
    'dark:shadow-none',
  ].join(' '),
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:ring-secondary/50',
  outline:
    'dark:border-input focus-visible:ring-outline bg-background dark:bg-input/30 focus-visible:border-outline hover:bg-muted dark:hover:bg-input/50 hover:text-foreground border shadow-xs',
  ghost: 'hover:bg-muted hover:text-foreground focus-visible:ring-outline',
  info: 'bg-info text-info-foreground hover:bg-info/90 focus-visible:ring-info/50',
  success:
    'bg-success-surface text-success-surface-foreground hover:bg-success-surface/90 focus-visible:ring-success-surface/50',
  warning:
    'bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning/50',
  error:
    'bg-error text-error-foreground hover:bg-error/90 focus-visible:ring-error/50',
}

const buttonSizeStyles = {
  sm: "h-11 px-4 text-sm has-[>svg]:px-3 [&_svg:not([class*='size-'])]:size-3.5",
  md: "h-11 px-5 text-base has-[>svg]:px-4 [&_svg:not([class*='size-'])]:size-4.5",
  lg: "h-12 px-8 text-lg has-[>svg]:px-6 [&_svg:not([class*='size-'])]:size-5",
  'icon-sm': "size-11 [&_svg:not([class*='size-'])]:size-3.5",
  icon: "size-11 [&_svg:not([class*='size-'])]:size-4.5",
  'icon-lg': "size-12 [&_svg:not([class*='size-'])]:size-5",
}

export const button = tv({
  base: buttonBase,
  variants: {
    variant: buttonVariantStyles,
    size: buttonSizeStyles,
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})
