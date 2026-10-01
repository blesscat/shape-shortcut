import { tv } from 'tailwind-variants'

const cardBase = [
  'bg-card text-card-foreground group/card ring-border flex flex-col gap-(--card-spacing) rounded-xl py-(--card-spacing) ring-1 shadow-soft',
  'transition-[box-shadow,transform] duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lift',
  'has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0',
  '*:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
]

const cardSizeStyles = {
  sm: '[--card-spacing:--spacing(4)] text-sm',
  md: '[--card-spacing:--spacing(5)]',
}

export const card = tv({
  base: cardBase,
  variants: {
    size: cardSizeStyles,
  },
  defaultVariants: {
    size: 'md',
  },
})

const cardActionBase =
  'col-start-2 row-span-2 row-start-1 self-start justify-self-end'

export const cardAction = tv({
  base: cardActionBase,
})

const cardContentBase = 'px-(--card-spacing)'

export const cardContent = tv({
  base: cardContentBase,
})

const cardDescriptionBase =
  'text-muted-foreground text-base group-data-[size=sm]/card:text-sm'

export const cardDescription = tv({
  base: cardDescriptionBase,
})

const cardFooterBase =
  'bg-muted/50 flex items-center rounded-b-xl border-t p-(--card-spacing)'

export const cardFooter = tv({
  base: cardFooterBase,
})

const cardHeaderBase = [
  '@container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing)',
  'has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]',
]

export const cardHeader = tv({
  base: cardHeaderBase,
})

const cardTitleBase =
  'font-heading text-xl leading-snug font-medium group-data-[size=sm]/card:text-base'

export const cardTitle = tv({
  base: cardTitleBase,
})
