import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createI18n, I18nContext } from './context'
import { DEFAULT_LANG, isLang, type Lang } from './translate'

const STORAGE_KEY = 'lang'

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isLang(stored) ? stored : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

/** Holds the chosen language (English by default), remembers it on this device, and sets <html lang>. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(
    () =>
      createI18n(lang, (next) => {
        setLangState(next)
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // Private mode: the choice just isn't remembered.
        }
      }),
    [lang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
