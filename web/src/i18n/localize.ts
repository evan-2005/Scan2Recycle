import type { ItemType, Material } from '../types'
import type { Lang } from './translate'

/** Malay value when the language is Malay and the database has one, otherwise English. */
function pick(lang: Lang, english: string, malay: string | null | undefined): string {
  return lang === 'ms' && malay ? malay : english
}

export function itemName(item: Pick<ItemType, 'display_name' | 'display_name_ms'>, lang: Lang): string {
  return pick(lang, item.display_name, item.display_name_ms)
}

export function itemTip(item: Pick<ItemType, 'tip' | 'tip_ms'>, lang: Lang): string | null {
  if (!item.tip) return null
  return pick(lang, item.tip, item.tip_ms)
}

export function materialName(material: Pick<Material, 'display_name' | 'display_name_ms'>, lang: Lang): string {
  return pick(lang, material.display_name, material.display_name_ms)
}

export function binName(material: Pick<Material, 'bin_name' | 'bin_name_ms'>, lang: Lang): string {
  return pick(lang, material.bin_name, material.bin_name_ms)
}
