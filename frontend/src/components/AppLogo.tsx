import Image from 'next/image'

type Props = {
  className?: string
}

/** Circular animated brand logo. */
export function AppLogo({ className = 'w-11 h-11 sm:w-12 sm:h-12' }: Props) {
  return (
    <div className={`app-logo ${className}`} role="img" aria-label="Code Migration">
      <span className="app-logo__ring" aria-hidden />
      <span className="app-logo__glow" aria-hidden />
      <span className="app-logo__scan" aria-hidden />
      <Image src="/PC.png" alt="" fill className="app-logo__image" sizes="48px" priority />
    </div>
  )
}
