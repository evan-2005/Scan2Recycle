import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: ReactNode
}

export function PageHeader({ eyebrow, title }: PageHeaderProps) {
  return (
    <header className="pt-10 pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-light">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl leading-[1.05] font-extrabold text-ink">{title}</h1>
    </header>
  )
}
