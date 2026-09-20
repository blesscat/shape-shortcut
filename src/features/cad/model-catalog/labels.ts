import type { ParameterField } from './types'
import { translate, type Locale } from '../../../i18n'

export function unitLabelFor(
  locale: Locale,
  unit: ParameterField['unit'],
): string {
  return translate(locale, `unit.${unit}`)
}

export function displayParameterLabel(
  field: ParameterField,
  locale: Locale,
): string {
  const label = translate(locale, field.label)
  if (field.labelFormat === 'axis') {
    return field.axis
  }
  if (field.labelFormat === 'label') {
    return label
  }

  return `${label}（${field.axis}）`
}
