import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vecinos',
  description: 'Marcador de partidas para vecinos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
