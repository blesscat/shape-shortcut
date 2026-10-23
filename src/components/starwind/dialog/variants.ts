import { tv } from 'tailwind-variants'

const dialogBackdropBase = [
  'fixed inset-0 top-0 left-0 z-50 h-screen w-screen bg-black/80 duration-200',
  'data-starting-style:!animate-none data-starting-style:opacity-0',
  'data-[state=open]:animate-in fade-in',
  'data-[state=closed]:animate-out data-[state=closed]:fill-mode-forwards fade-out',
]

export const dialogBackdrop = tv({
  base: dialogBackdropBase,
})

const dialogContentBase = [
  'fixed top-4 left-[50%] z-50 translate-x-[-50%] sm:top-[50%] sm:translate-y-[-50%]',
  'bg-background w-full max-w-md rounded-container border p-8 shadow-lg',
  'data-starting-style:!animate-none data-starting-style:opacity-0',
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fill-mode-forwards transition-[translate,scale,opacity] duration-200',
  'fade-in zoom-in-95 slide-in-from-bottom-2',
  'fade-out zoom-out-95 slide-out-to-bottom-2',
  'data-[state=open]:data-nested-dialog-open:-translate-y-[calc(50%-var(--nested-offset)*var(--nested-dialogs,1))]',
  'data-[state=open]:data-nested-dialog-open:scale-[calc(1-var(--nested-scale)*var(--nested-dialogs,1))]',
  'max-sm:data-[state=open]:data-nested-dialog-open:translate-y-[calc(var(--nested-offset)*var(--nested-dialogs,1))]',
]

export const dialogContent = tv({
  base: dialogContentBase,
})

const dialogCloseButtonBase = [
  'text-muted-foreground',
  'absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-control [&>svg]:opacity-70 hover:[&>svg]:opacity-100',
  'focus-visible:ring-outline transition-[color,box-shadow] outline-none focus-visible:ring-3',
]

export const dialogCloseButton = tv({
  base: dialogCloseButtonBase,
})

const dialogDescriptionBase = 'text-muted-foreground'

export const dialogDescription = tv({
  base: dialogDescriptionBase,
})

const dialogFooterBase =
  'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'

export const dialogFooter = tv({
  base: dialogFooterBase,
})

const dialogHeaderBase = 'flex flex-col space-y-2 text-center sm:text-left'

export const dialogHeader = tv({
  base: dialogHeaderBase,
})

const dialogTitleBase =
  'font-heading text-xl leading-none font-semibold tracking-tight'

export const dialogTitle = tv({
  base: dialogTitleBase,
})
