'use client'

import { Component, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, BellOff, Gamepad2, Heart, Home, Mail, X } from 'lucide-react'
import { storage } from '../lib/client-storage'

export class AppErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false } }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (!this.state.crashed) return this.props.children
    return <main className="crash-page"><div><Heart size={34} fill="currentColor"/><h1>Let’s try that again.</h1><p>Something unexpected happened, but your little corner is still here.</p><button className="primary" onClick={() => { storage.remove('deborah-game'); window.location.reload() }}>Restart the app</button></div></main>
  }
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(window.atob(base64), character => character.charCodeAt(0))
}

function NotificationControl() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const panelRef = useRef(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setStatus('unsupported'); return }
    navigator.serviceWorker.register('/sw.js').then(registration => registration.pushManager.getSubscription()).then(subscription => {
      setStatus(subscription ? 'enabled' : Notification.permission === 'denied' ? 'denied' : 'disabled')
    }).catch(() => setStatus('unsupported'))
  }, [])

  useEffect(() => {
    const close = event => panelRef.current && !panelRef.current.contains(event.target) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const subscribe = async recipient => {
    setStatus('loading'); setMessage('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }
      const registration = await navigator.serviceWorker.ready
      const { publicKey } = await (await fetch('/api/push')).json()
      if (!publicKey) throw new Error('Notifications are not configured yet.')
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      const response = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON(), recipient }) })
      if (!response.ok) throw new Error('Could not save your preference.')
      storage.set('notification-recipient', recipient); setStatus('enabled'); setOpen(false)
    } catch (error) { setStatus('disabled'); setMessage(error.message) }
  }

  const unsubscribe = async () => {
    setStatus('loading'); setMessage('')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) })
        await subscription.unsubscribe()
      }
      storage.remove('notification-recipient'); setStatus('disabled'); setOpen(false)
    } catch { setStatus('enabled'); setMessage('Could not turn notifications off. Please try again.') }
  }

  if (status === 'unsupported') return null
  return <div className="notification-control" ref={panelRef}><button className={`notification-toggle ${status === 'enabled' ? 'enabled' : ''}`} onClick={() => setOpen(value => !value)} aria-label="Notification settings" aria-expanded={open} disabled={status === 'loading'}>{status === 'enabled' ? <Bell size={17} fill="currentColor"/> : <BellOff size={17}/>}<span>{status === 'enabled' ? 'Notifications on' : 'Notify me'}</span></button>{open && <div className="notification-panel"><button className="notification-close" onClick={() => setOpen(false)} aria-label="Close"><X size={15}/></button>{status === 'enabled' ? <><strong>Love-note alerts are on</strong><p>You’ll know when a new note is waiting, even when this site is closed.</p><button className="notification-off" onClick={unsubscribe}>Turn notifications off</button></> : <><strong>Who are you?</strong><p>Choose whose love notes should light up this device.</p><div><button onClick={() => subscribe('deborah')}>♡ I’m Deborah</button><button onClick={() => subscribe('brume')}>♠ I’m Brume</button></div>{status === 'denied' && <small>Notifications are blocked. Allow them in your browser settings, then try again.</small>}</>}{message && <small>{message}</small>}</div>}</div>
}

export function SiteNav({ section = '' }) {
  return <header className="nav-wrap"><nav className="nav shell" aria-label="Main navigation">
    <Link className="brand" href="/" aria-label="Deborah, home"><span>D</span><strong>Deborah</strong></Link>
    <div className="nav-links">
      <Link className={section === 'home' ? 'active' : ''} href="/"><Home size={16}/> Home</Link>
      <Link className={section === 'games' ? 'active' : ''} href="/games"><Gamepad2 size={16}/> Games</Link>
      <Link className={section === 'notes' ? 'active' : ''} href="/notes"><Mail size={16}/> Notes</Link>
    </div>
    <div className="nav-actions"><NotificationControl/><Link className="love-note-link" href="/notes"><Mail size={16}/> Love notes</Link></div>
  </nav></header>
}

export function SiteFooter() {
  return <footer><div className="shell">Made for Deborah <span>♥</span><small>One little website. A whole lot of love.</small></div></footer>
}

export function PageShell({ section, children }) {
  return <AppErrorBoundary><SiteNav section={section}/>{children}<SiteFooter/></AppErrorBoundary>
}
