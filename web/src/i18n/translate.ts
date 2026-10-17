import { en, type MessageKey } from './en'
import { ms } from './ms'

export type Lang = 'en' | 'ms'
export const LANGS: readonly Lang[] = ['en', 'ms']
export const DEFAULT_LANG: Lang = 'en'

export type Vars = Readonly<Record<string, string | number>>

/** A translatable message that library code can return without knowing the language. */
export interface Message {
  key: MessageKey
  vars?: Vars
}

export function msg(key: MessageKey, vars?: Vars): Message {
  return vars ? { key, vars } : { key }
}

/** An Error that carries a translatable Message, so catch blocks can show it in the user's language. */
export class MessageError extends Error {
  readonly userMessage: Message

  constructor(userMessage: Message) {
    super(userMessage.key)
    this.name = 'MessageError'
    this.userMessage = userMessage
  }
}

const DICTIONARIES: Readonly<Record<Lang, Readonly<Record<MessageKey, string>>>> = { en, ms }

/** Fills {placeholders}; unknown placeholders are left visible so mistakes are easy to spot. */
export function format(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  return format(DICTIONARIES[lang][key] ?? en[key], vars)
}

/** Picks `${base}_one` or `${base}_other` by count, with {n} filled in. */
export function plural(lang: Lang, base: string, n: number, vars?: Vars): string {
  const key = `${base}_${n === 1 ? 'one' : 'other'}` as MessageKey
  return translate(lang, key, { n, ...vars })
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'ms'
}

/** BCP 47 locale for dates and numbers. */
export function localeFor(lang: Lang): string {
  return lang === 'ms' ? 'ms-MY' : 'en-MY'
}
