import { tv } from 'tailwind-variants'

const badgeBase = [
  'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
  '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  'transition-all duration-200 outline-none focus-visible:ring-3',
  'aria-invalid:border-error aria-invalid:focus-visible:ring-error/40',
] as const

const badgeVariantStyles = {
  default: 'bg-foreground text-background focus-visible:ring-outline/50',
  primary: 'bg-primary text-primary-foreground focus-visible:ring-primary/50',
  secondary:
    'bg-secondary text-secondary-foreground focus-visible:ring-secondary/50',
  outline:
    'border-border focus-visible:border-outline focus-visible:ring-outline/50 border',
  ghost: 'bg-foreground/10 text-foreground focus-visible:ring-outline/50',
  info: 'bg-info text-info-foreground focus-visible:ring-info/50',
  success:
    'bg-success-surface text-success-surface-foreground focus-visible:ring-success-surface/50',
  warning: 'bg-warning text-warning-foreground focus-visible:ring-warning/50',
  error: 'bg-error text-error-foreground focus-visible:ring-error/50',
} as const

const badgeToneStyles = {
  neutral: '',
  primary: '',
  'primary-accent': '',
  secondary: '',
  'secondary-accent': '',
  info: '',
  success: '',
  warning: '',
  error: '',
} as const

const badgeAppearanceStyles = {
  solid: '',
  soft: '',
  outline: '',
  text: '',
  frosted: '',
} as const

const badgeEyebrowStyles = {
  true: 'font-mono uppercase tracking-wider',
  false: '',
} as const

const badgeSizeStyles = {
  sm: "px-2.5 py-0.5 text-xs [&_svg:not([class*='size-'])]:size-3",
  md: "px-3 py-0.5 text-sm [&_svg:not([class*='size-'])]:size-4",
  lg: "px-4 py-1 text-base [&_svg:not([class*='size-'])]:size-4.5",
} as const

const badgeLinkStyles = {
  true: 'cursor-pointer',
  false: '',
} as const

type BadgeCompoundVariant = {
  isLink?: boolean
  variant?: keyof typeof badgeVariantStyles
  tone?: keyof typeof badgeToneStyles
  appearance?: keyof typeof badgeAppearanceStyles
  className?: string
}

const badgeCompoundVariants: BadgeCompoundVariant[] = [
  {
    isLink: true,
    variant: 'default',
    className: 'hover:bg-foreground/80',
  },
  {
    isLink: true,
    variant: 'primary',
    className: 'hover:bg-primary/80',
  },
  {
    isLink: true,
    variant: 'secondary',
    className: 'hover:bg-secondary/80',
  },
  {
    isLink: true,
    variant: 'outline',
    className: 'hover:border-border/80',
  },
  {
    isLink: true,
    variant: 'ghost',
    className: 'hover:bg-foreground/7',
  },
  {
    isLink: true,
    variant: 'info',
    className: 'hover:bg-info/80',
  },
  {
    isLink: true,
    variant: 'success',
    className: 'hover:bg-success-surface/80',
  },
  {
    isLink: true,
    variant: 'warning',
    className: 'hover:bg-warning/80',
  },
  {
    isLink: true,
    variant: 'error',
    className: 'hover:bg-error/80',
  },
  {
    isLink: true,
    appearance: 'frosted',
    className: 'hover:bg-background/90',
  },
  {
    isLink: true,
    appearance: 'text',
    className: 'hover:underline underline-offset-4',
  },
  {
    isLink: true,
    tone: 'neutral',
    appearance: 'solid',
    className: 'hover:bg-foreground/80',
  },
  {
    isLink: true,
    tone: 'primary',
    appearance: 'solid',
    className: 'hover:bg-primary/80',
  },
  {
    isLink: true,
    tone: 'primary-accent',
    appearance: 'solid',
    className: 'hover:bg-primary-accent/80',
  },
  {
    isLink: true,
    tone: 'secondary',
    appearance: 'solid',
    className: 'hover:bg-secondary/80',
  },
  {
    isLink: true,
    tone: 'secondary-accent',
    appearance: 'solid',
    className: 'hover:bg-secondary-accent/80',
  },
  {
    isLink: true,
    tone: 'info',
    appearance: 'solid',
    className: 'hover:bg-info/80',
  },
  {
    isLink: true,
    tone: 'success',
    appearance: 'solid',
    className: 'hover:bg-success-surface/80',
  },
  {
    isLink: true,
    tone: 'warning',
    appearance: 'solid',
    className: 'hover:bg-warning/80',
  },
  {
    isLink: true,
    tone: 'error',
    appearance: 'solid',
    className: 'hover:bg-error/80',
  },
  {
    isLink: true,
    tone: 'neutral',
    appearance: 'soft',
    className: 'hover:bg-foreground/20',
  },
  {
    isLink: true,
    tone: 'primary',
    appearance: 'soft',
    className: 'hover:bg-primary/20',
  },
  {
    isLink: true,
    tone: 'primary-accent',
    appearance: 'soft',
    className: 'hover:bg-primary-accent/20',
  },
  {
    isLink: true,
    tone: 'secondary',
    appearance: 'soft',
    className: 'hover:bg-secondary/20',
  },
  {
    isLink: true,
    tone: 'secondary-accent',
    appearance: 'soft',
    className: 'hover:bg-secondary-accent/20',
  },
  {
    isLink: true,
    tone: 'info',
    appearance: 'soft',
    className: 'hover:bg-info/20',
  },
  {
    isLink: true,
    tone: 'success',
    appearance: 'soft',
    className: 'hover:bg-success-surface/20',
  },
  {
    isLink: true,
    tone: 'warning',
    appearance: 'soft',
    className: 'hover:bg-warning/20',
  },
  {
    isLink: true,
    tone: 'error',
    appearance: 'soft',
    className: 'hover:bg-error/20',
  },
  {
    isLink: true,
    tone: 'neutral',
    appearance: 'outline',
    className: 'hover:bg-foreground/10',
  },
  {
    isLink: true,
    tone: 'primary',
    appearance: 'outline',
    className: 'hover:bg-primary/10',
  },
  {
    isLink: true,
    tone: 'primary-accent',
    appearance: 'outline',
    className: 'hover:bg-primary-accent/10',
  },
  {
    isLink: true,
    tone: 'secondary',
    appearance: 'outline',
    className: 'hover:bg-secondary/10',
  },
  {
    isLink: true,
    tone: 'secondary-accent',
    appearance: 'outline',
    className: 'hover:bg-secondary-accent/10',
  },
  {
    isLink: true,
    tone: 'info',
    appearance: 'outline',
    className: 'hover:bg-info/10',
  },
  {
    isLink: true,
    tone: 'success',
    appearance: 'outline',
    className: 'hover:bg-success-surface/10',
  },
  {
    isLink: true,
    tone: 'warning',
    appearance: 'outline',
    className: 'hover:bg-warning/10',
  },
  {
    isLink: true,
    tone: 'error',
    appearance: 'outline',
    className: 'hover:bg-error/10',
  },
  {
    tone: 'neutral',
    appearance: 'solid',
    className: 'bg-foreground text-background focus-visible:ring-outline/50',
  },
  {
    tone: 'primary',
    appearance: 'solid',
    className:
      'bg-primary text-primary-foreground focus-visible:ring-primary/50',
  },
  {
    tone: 'primary-accent',
    appearance: 'solid',
    className:
      'bg-primary-accent text-background focus-visible:ring-primary-accent/50',
  },
  {
    tone: 'secondary',
    appearance: 'solid',
    className:
      'bg-secondary text-secondary-foreground focus-visible:ring-secondary/50',
  },
  {
    tone: 'secondary-accent',
    appearance: 'solid',
    className:
      'bg-secondary-accent text-background focus-visible:ring-secondary-accent/50',
  },
  {
    tone: 'info',
    appearance: 'solid',
    className: 'bg-info text-info-foreground focus-visible:ring-info/50',
  },
  {
    tone: 'success',
    appearance: 'solid',
    className:
      'bg-success-surface text-success-surface-foreground focus-visible:ring-success-surface/50',
  },
  {
    tone: 'warning',
    appearance: 'solid',
    className:
      'bg-warning text-warning-foreground focus-visible:ring-warning/50',
  },
  {
    tone: 'error',
    appearance: 'solid',
    className: 'bg-error text-error-foreground focus-visible:ring-error/50',
  },
  {
    tone: 'neutral',
    appearance: 'soft',
    className: 'bg-foreground/10 text-foreground focus-visible:ring-outline/50',
  },
  {
    tone: 'primary',
    appearance: 'soft',
    className: 'bg-primary/10 text-foreground focus-visible:ring-primary/50',
  },
  {
    tone: 'primary-accent',
    appearance: 'soft',
    className:
      'bg-primary-accent/10 text-primary-accent focus-visible:ring-primary-accent/50',
  },
  {
    tone: 'secondary',
    appearance: 'soft',
    className:
      'bg-secondary/10 text-foreground focus-visible:ring-secondary/50',
  },
  {
    tone: 'secondary-accent',
    appearance: 'soft',
    className:
      'bg-secondary-accent/10 text-secondary-accent focus-visible:ring-secondary-accent/50',
  },
  {
    tone: 'info',
    appearance: 'soft',
    className: 'bg-info/10 text-foreground focus-visible:ring-info/50',
  },
  {
    tone: 'success',
    appearance: 'soft',
    className:
      'bg-success-surface/10 text-foreground focus-visible:ring-success-surface/50',
  },
  {
    tone: 'warning',
    appearance: 'soft',
    className: 'bg-warning/10 text-foreground focus-visible:ring-warning/50',
  },
  {
    tone: 'error',
    appearance: 'soft',
    className: 'bg-error/10 text-foreground focus-visible:ring-error/50',
  },
  {
    tone: 'neutral',
    appearance: 'outline',
    className:
      'border border-border text-foreground focus-visible:ring-outline/50',
  },
  {
    tone: 'primary',
    appearance: 'outline',
    className:
      'border border-primary text-foreground focus-visible:ring-primary/50',
  },
  {
    tone: 'primary-accent',
    appearance: 'outline',
    className:
      'border border-primary-accent text-primary-accent focus-visible:ring-primary-accent/50',
  },
  {
    tone: 'secondary',
    appearance: 'outline',
    className:
      'border border-secondary text-secondary-foreground focus-visible:ring-secondary/50',
  },
  {
    tone: 'secondary-accent',
    appearance: 'outline',
    className:
      'border border-secondary-accent text-secondary-accent focus-visible:ring-secondary-accent/50',
  },
  {
    tone: 'info',
    appearance: 'outline',
    className: 'border border-info text-foreground focus-visible:ring-info/50',
  },
  {
    tone: 'success',
    appearance: 'outline',
    className:
      'border border-success text-foreground focus-visible:ring-success-surface/50',
  },
  {
    tone: 'warning',
    appearance: 'outline',
    className:
      'border border-warning text-foreground focus-visible:ring-warning/50',
  },
  {
    tone: 'error',
    appearance: 'outline',
    className:
      'border border-error text-foreground focus-visible:ring-error/50',
  },
  {
    appearance: 'text',
    className: 'rounded-none border-0 bg-transparent p-0 shadow-none',
  },
  {
    tone: 'neutral',
    appearance: 'text',
    className: 'text-foreground focus-visible:ring-outline/50',
  },
  {
    tone: 'primary',
    appearance: 'text',
    className: 'text-primary focus-visible:ring-primary/50',
  },
  {
    tone: 'primary-accent',
    appearance: 'text',
    className: 'text-primary-accent focus-visible:ring-primary-accent/50',
  },
  {
    tone: 'secondary',
    appearance: 'text',
    className: 'text-secondary-foreground focus-visible:ring-secondary/50',
  },
  {
    tone: 'secondary-accent',
    appearance: 'text',
    className: 'text-secondary-accent focus-visible:ring-secondary-accent/50',
  },
  {
    tone: 'info',
    appearance: 'text',
    className: 'text-info focus-visible:ring-info/50',
  },
  {
    tone: 'success',
    appearance: 'text',
    className: 'text-success focus-visible:ring-success-surface/50',
  },
  {
    tone: 'warning',
    appearance: 'text',
    className: 'text-warning focus-visible:ring-warning/50',
  },
  {
    tone: 'error',
    appearance: 'text',
    className: 'text-error focus-visible:ring-error/50',
  },
  {
    appearance: 'frosted',
    className: 'border bg-background/80 shadow-sm backdrop-blur-sm',
  },
  {
    tone: 'neutral',
    appearance: 'frosted',
    className: 'border-border/60 text-foreground focus-visible:ring-outline/50',
  },
  {
    tone: 'primary',
    appearance: 'frosted',
    className:
      'border-primary/40 text-foreground focus-visible:ring-primary/50',
  },
  {
    tone: 'primary-accent',
    appearance: 'frosted',
    className:
      'border-primary-accent/40 text-primary-accent focus-visible:ring-primary-accent/50',
  },
  {
    tone: 'secondary',
    appearance: 'frosted',
    className:
      'border-secondary/60 text-secondary-foreground focus-visible:ring-secondary/50',
  },
  {
    tone: 'secondary-accent',
    appearance: 'frosted',
    className:
      'border-secondary-accent/40 text-secondary-accent focus-visible:ring-secondary-accent/50',
  },
  {
    tone: 'info',
    appearance: 'frosted',
    className: 'border-info/40 text-foreground focus-visible:ring-info/50',
  },
  {
    tone: 'success',
    appearance: 'frosted',
    className:
      'border-success/40 text-foreground focus-visible:ring-success-surface/50',
  },
  {
    tone: 'warning',
    appearance: 'frosted',
    className:
      'border-warning/40 text-foreground focus-visible:ring-warning/50',
  },
  {
    tone: 'error',
    appearance: 'frosted',
    className: 'border-error/40 text-foreground focus-visible:ring-error/50',
  },
]

const badgeDefaultVariants = {
  variant: 'default',
  size: 'md',
  eyebrow: false,
  isLink: false,
} as const

export const badge = tv({
  base: badgeBase,
  variants: {
    variant: badgeVariantStyles,
    tone: badgeToneStyles,
    appearance: badgeAppearanceStyles,
    eyebrow: badgeEyebrowStyles,
    size: badgeSizeStyles,
    isLink: badgeLinkStyles,
  },
  compoundVariants: badgeCompoundVariants,
  defaultVariants: badgeDefaultVariants,
})
