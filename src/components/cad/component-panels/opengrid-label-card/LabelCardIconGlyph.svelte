<script lang="ts">
  import type { LabelCardIconPath } from '../../../../cad-kernel/components/opengrid-label-card/icon-paths'

  let {
    iconPath,
    selected,
    testid,
    text,
    ariaLabel,
    onclick,
  }: {
    iconPath: LabelCardIconPath | undefined
    selected: boolean
    testid: string
    text: string
    ariaLabel?: string
    onclick: () => void
  } = $props()
</script>

<button
  type="button"
  class="flex flex-col items-center gap-1 rounded-lg border p-2"
  class:border-primary={selected}
  aria-pressed={selected}
  aria-label={ariaLabel}
  data-testid={testid}
  {onclick}
>
  <svg
    viewBox="0 0 16 16"
    width="24"
    height="24"
    fill="currentColor"
    aria-hidden="true"
  >
    {#each iconPath?.paths ?? [] as pathData (pathData)}
      <path
        d={pathData}
        fill-rule={iconPath?.evenOdd ? 'evenodd' : undefined}
      />
    {/each}
  </svg>
  <span class="text-xs">
    {text}
  </span>
</button>
