import type { Metadata } from 'next'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import { ui } from '@/lib/ui'
import './globals.css'

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Code Migration | AI Code Converter',
  description: ui.metaDesc,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-[family-name:var(--font-sans)] antialiased">{children}</body>
    </html>
  )
}
