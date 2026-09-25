import { Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const ui = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-ui', display: 'swap' })
const data = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-data', display: 'swap' })

export const metadata = { title: 'CRM Pompes à chaleur' }
export const viewport = { width: 'device-width', initialScale: 1 }

export default function Layout({ children }) {
  return (
    <html lang="fr" className={`${ui.variable} ${data.variable}`}>
      <body>{children}</body>
    </html>
  )
}
