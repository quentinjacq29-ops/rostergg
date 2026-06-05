import type { ReactNode } from 'react'
import { Anton, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-body' })
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500', '700'] })

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={`${anton.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
