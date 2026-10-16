import { useI18n } from '../i18n/context'
import { LANGS } from '../i18n/translate'

/** EN | BM toggle. Shown at the top of every page; the choice is remembered on this device. */
export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n()

  return (
    <div role="group" aria-label={t('lang.label')} className="inline-flex rounded-full bg-paper-deep p-0.5 text-xs font-semibold shadow-inner">
      {LANGS.map((option) => {
        const isOn = option === lang
        return (
          <button
            key={option}
            type="button"
            lang={option}
            aria-pressed={isOn}
            aria-label={t(option === 'en' ? 'lang.enName' : 'lang.msName')}
            onClick={() => setLang(option)}
            className={`min-h-9 min-w-11 rounded-full px-3 transition ${isOn ? 'bg-forest text-paper shadow-sm' : 'text-ink-soft hover:text-ink'}`}
          >
            {t(option === 'en' ? 'lang.en' : 'lang.ms')}
          </button>
        )
      })}
    </div>
  )
}
