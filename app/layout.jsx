import './globals.css'

export const metadata = {
  title: 'For Deborah — always',
  description: 'A little corner of the internet for Deborah.',
}

export const viewport = {
  themeColor: '#fffaf5',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
