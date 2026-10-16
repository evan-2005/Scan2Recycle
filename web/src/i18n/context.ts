import { createContext, useContext } from 'react'
import type { MessageKey } from './en'
import { DEFAULT_LANG, localeFor, plural, translate, type Lang, type Message, type Vars } from './translate'

export interface I18n {
  lang: Lang
  locale: string
  setLang: (lang: Lang) => void
  /** Translate a key. */
  t: (key: MessageKey, vars?: Vars) => string
  /** Translate a Message returned by library code (errors, validation). */
  m: (message: Message) => string
  /** Pluralised text, e.g. n('common.items', 3) → "3 items". */
  n: (base: string, count: number, vars?: Vars) => string
}

export function createI18n(lang: Lang, setLang: (lang: Lang) => void): I18n {
  return {
    lang,
    locale: localeFor(lang),
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    m: (message) => translate(lang, message.key, message.vars),
    n: (base, count, vars) => plural(lang, base, count, vars),
  }
}

export const I18nContext = createContext<I18n>(createI18n(DEFAULT_LANG, () => {}))

export function useI18n(): I18n {
  return useContext(I18nContext)
}
