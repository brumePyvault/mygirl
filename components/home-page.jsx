'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Heart, Sparkles } from 'lucide-react'
import { storage } from '../lib/client-storage'

export function RecipientPicker({ value, onChange }) {
  return <fieldset className="recipient-picker"><legend>This note is for</legend><button type="button" className={value === 'deborah' ? 'selected her' : ''} onClick={() => onChange('deborah')}>♡ Deborah</button><button type="button" className={value === 'brume' ? 'selected him' : ''} onClick={() => onChange('brume')}>♠ Brume</button></fieldset>
}

export default function HomePage() {
  const router = useRouter()
  const [note, setNote] = useState(() => storage.get('deborah-note') || '')
  const [recipient, setRecipient] = useState('deborah')
  const [saved, setSaved] = useState(false)
  const saveNote = async () => {
    storage.set('deborah-note', note)
    try {
      const response = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: note, recipient }) })
      if (!response.ok) throw new Error('Save failed')
      setNote(''); storage.remove('deborah-note'); setSaved(true); setTimeout(() => setSaved(false), 1800)
    } catch { router.push('/notes') }
  }
  return <main>
    <section className="hero shell">
      <div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/> A corner of the internet, just for us</div><h1>Welcome, <em>Deborah.</em></h1><p className="lead">I made this little place to hold our favorite memories, silly games, and all the words I never want to leave unsaid.</p><div className="hero-actions"><button className="primary" onClick={() => router.push('/games')}>Play a game <ArrowRight size={18}/></button><button className="secondary" onClick={() => router.push('/notes')}>Leave a love note</button></div><div className="promise"><Heart size={18} fill="currentColor"/><span><strong>Made with intention</strong><small>For the quiet days, loud laughs, and everything in between.</small></span></div></div>
      <div className="hero-art" aria-label="A love letter for Deborah"><div className="orbit orbit-one">✦</div><div className="orbit orbit-two">♡</div><div className="letter"><div className="letter-stamp">D</div><span>my dearest</span><h2>For you,<br/>always.</h2><p>— with all my love</p></div><div className="flower f1">✿</div><div className="flower f2">❀</div><div className="flower f3">✿</div></div>
    </section>
    <section className="moments shell"><div><span className="section-kicker">OURS TO KEEP</span><h2>Little things, big love.</h2></div><div className="moment-grid"><article><span>01</span><h3>Play together</h3><p>Settle the score with a quick round of Higher or Lower.</p><button onClick={() => router.push('/games')}>Open games <ArrowRight size={15}/></button></article><article><span>02</span><h3>Write it down</h3><p>Leave a note for the words worth keeping close.</p><button onClick={() => router.push('/notes')}>Write a note <ArrowRight size={15}/></button></article><article><span>03</span><h3>More to come</h3><p>This is only the first page of something that keeps growing.</p><div className="soon">SOON, MY LOVE</div></article></div></section>
    <section className="notes-section" id="notes"><div className="shell note-layout"><div><span className="section-kicker">A NOTE FOR US</span><h2>Some things deserve<br/>to be written down.</h2><p>Your note joins your private shared archive, ready whenever you come back.</p></div><div className="note-card"><RecipientPicker value={recipient} onChange={setRecipient}/><label htmlFor="love-note">My love,</label><textarea id="love-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Today I wanted to remind you that…" maxLength={500}/><div><small>{note.length} / 500</small><button onClick={saveNote} disabled={!note.trim()}>{saved ? 'Saved with love ♥' : 'Keep this note'} <Heart size={15}/></button></div></div></div></section>
  </main>
}
