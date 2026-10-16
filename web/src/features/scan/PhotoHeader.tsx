import type { ReactNode } from 'react'

interface PhotoHeaderProps {
  /** null for answers that came from search rather than a photo. */
  photoUrl: string | null
  eyebrow: string
  children: ReactNode
}

/** The scanned photo next to the headline, shared by every result-style screen. */
export function PhotoHeader({ photoUrl, eyebrow, children }: PhotoHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      {photoUrl ? (
        <img src={photoUrl} alt="Your photo" className="size-24 shrink-0 rounded-2xl object-cover shadow-md ring-4 ring-white" />
      ) : (
        <div aria-hidden="true" className="grid size-24 shrink-0 place-items-center rounded-2xl bg-white text-4xl shadow-md">
          🔎
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-light">{eyebrow}</p>
        <div className="mt-1 font-display text-3xl leading-tight font-extrabold break-words">{children}</div>
      </div>
    </div>
  )
}
