'use client'

import { Component } from 'react'
import Link from 'next/link'
import { Gamepad2, Heart, Home, Mail } from 'lucide-react'
import { storage } from '../lib/client-storage'

export class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false } }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (!this.state.crashed) return this.props.children
    return <main className="crash-page"><div><Heart size={34} fill="currentColor"/><h1>Let’s try that again.</h1><p>Something unexpected happened, but your little corner is still here.</p><button className="primary" onClick={() => { storage.remove('deborah-game'); window.location.reload() }}>Restart the app</button></div></main>
  }
}

export function SiteNav({ section = '' }) {
  return <header className="nav-wrap"><nav className="nav shell" aria-label="Main navigation">
    <Link className="brand" href="/" aria-label="Deborah, home"><span>D</span><strong>Deborah</strong></Link>
    <div className="nav-links">
      <Link className={section === 'home' ? 'active' : ''} href="/"><Home size={16}/> Home</Link>
      <Link className={section === 'games' ? 'active' : ''} href="/games"><Gamepad2 size={16}/> Games</Link>
      <Link className={section === 'notes' ? 'active' : ''} href="/notes"><Mail size={16}/> Notes</Link>
    </div>
    <Link className="love-note-link" href="/notes"><Mail size={16}/> Love notes</Link>
  </nav></header>
}

export function SiteFooter() {
  return <footer><div className="shell">Made for Deborah <span>♥</span><small>One little website. A whole lot of love.</small></div></footer>
}

export function PageShell({ section, children }) {
  return <AppErrorBoundary><SiteNav section={section}/>{children}<SiteFooter/></AppErrorBoundary>
}
