import { describe, expect, it } from 'vitest'
import { en, type MessageKey } from './en'
import { binName, itemName, itemTip, materialName } from './localize'
import { ms } from './ms'
import { format, isLang, msg, MessageError, plural, translate } from './translate'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('dictionaries', () => {
  it('Malay has exactly the same keys as English', () => {
    expect(Object.keys(ms).sort()).toEqual(Object.keys(en).sort())
  })

  it('every Malay text keeps the same placeholders as the English one', () => {
    const mismatched = (Object.keys(en) as MessageKey[]).filter((key) => placeholders(en[key]).join() !== placeholders(ms[key]).join())
    expect(mismatched).toEqual([])
  })

  it('has no empty texts', () => {
    expect(Object.entries(ms).filter(([, text]) => text.trim() === '')).toEqual([])
  })

  it('uses typographic apostrophes in English, like the rest of the text', () => {
    const straight = (Object.keys(en) as MessageKey[]).filter((key) => /[A-Za-z]'[a-z]/.test(en[key]))
    expect(straight).toEqual([])
  })
})

describe('format / translate', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(format('Hi {name}, {missing}', { name: 'Aina' })).toBe('Hi Aina, {missing}')
  })

  it('translates by language', () => {
    expect(translate('en', 'nav.scan')).toBe('Scan')
    expect(translate('ms', 'nav.scan')).toBe('Imbas')
    expect(translate('ms', 'result.confidence', { percent: 80 })).toBe('Keyakinan AI: 80%')
  })

  it('pluralises', () => {
    expect(plural('en', 'common.items', 1)).toBe('1 item')
    expect(plural('en', 'common.items', 3)).toBe('3 items')
    expect(plural('ms', 'common.items', 3)).toBe('3 barang')
  })

  it('builds messages for library code', () => {
    expect(msg('error.password', { n: 8 })).toEqual({ key: 'error.password', vars: { n: 8 } })
    expect(msg('error.email')).toEqual({ key: 'error.email' })
  })

  it('carries a message inside an Error', () => {
    const error = new MessageError(msg('error.imageRead'))
    expect(error).toBeInstanceOf(Error)
    expect(error.userMessage).toEqual({ key: 'error.imageRead' })
    expect(translate('ms', error.userMessage.key)).not.toBe(translate('en', error.userMessage.key))
  })

  it('recognises languages', () => {
    expect(isLang('ms')).toBe(true)
    expect(isLang('fr')).toBe(false)
    expect(isLang(null)).toBe(false)
  })
})

describe('localize', () => {
  const item = { display_name: 'Battery', display_name_ms: 'Bateri', tip: 'Never bin it.', tip_ms: 'Jangan buang.' }
  const material = { display_name: 'Paper', display_name_ms: 'Kertas', bin_name: 'Blue bin', bin_name_ms: 'Tong biru' }

  it('uses Malay values in Malay', () => {
    expect(itemName(item, 'ms')).toBe('Bateri')
    expect(itemTip(item, 'ms')).toBe('Jangan buang.')
    expect(materialName(material, 'ms')).toBe('Kertas')
    expect(binName(material, 'ms')).toBe('Tong biru')
  })

  it('uses English in English, and falls back to English when Malay is missing', () => {
    expect(itemName(item, 'en')).toBe('Battery')
    expect(itemName({ display_name: 'Battery', display_name_ms: null }, 'ms')).toBe('Battery')
    expect(itemTip({ tip: null, tip_ms: 'x' }, 'ms')).toBeNull()
  })
})
