'use client'

import { useEffect, useState } from 'react'
import { Heart, Pencil, Trash2 } from 'lucide-react'
import { storage } from '../lib/client-storage'
import { RecipientPicker } from './home-page'

export default function NotesPage() {
  const [notes, setNotes] = useState([])
  const [message, setMessage] = useState(() => storage.get('deborah-note') || '')
  const [recipient, setRecipient] = useState('deborah')
  const [status, setStatus] = useState('loading')
  const [editing, setEditing] = useState('')
  const [codePrompt, setCodePrompt] = useState(null)
  const [code, setCode] = useState('')
  const [actionError, setActionError] = useState('')
  const loadNotes = async () => { try { const response = await fetch('/api/notes'); if (!response.ok) throw new Error(); setNotes((await response.json()).notes); setStatus('ready') } catch { setStatus('error') } }
  useEffect(() => { loadNotes() }, [])
  const submit = async event => {
    event.preventDefault(); setStatus('saving')
    try { const response = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, recipient }) }); if (!response.ok) throw new Error(); setMessage(''); storage.remove('deborah-note'); await loadNotes() }
    catch { storage.set('deborah-note', message); setStatus('error') }
  }
  const requestAction = (note, action) => { setCode(''); setActionError(''); setEditing(note.message); setCodePrompt({ note, action }) }
  const confirmAction = async event => {
    event.preventDefault(); setActionError('')
    const { note, action } = codePrompt
    const response = await fetch('/api/notes', { method: action === 'delete' ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: note._id, code, message: editing }) })
    if (!response.ok) { const data = await response.json().catch(() => ({})); setActionError(data.error || 'That did not work.'); return }
    setCodePrompt(null); await loadNotes()
  }
  return <main className="notes-page shell"><div className="notes-heading"><span className="section-kicker">OUR LOVE, IN WORDS</span><h1>Notes worth keeping.</h1><p>A shared little archive, saved safely for both of you.</p></div>
    <form className="note-card note-composer" onSubmit={submit}><RecipientPicker value={recipient} onChange={setRecipient}/><label htmlFor="new-note">My love,</label><textarea id="new-note" value={message} onChange={event => setMessage(event.target.value)} placeholder="Today I wanted to remind you that…" maxLength={500}/><div><small>{message.length} / 500</small><button disabled={!message.trim() || status === 'saving'}>{status === 'saving' ? 'Keeping…' : 'Keep this note'} <Heart size={15}/></button></div></form>
    {status === 'loading' ? <p className="notes-status">Opening your notes…</p> : status === 'error' ? <p className="notes-status error">The notes backend is unavailable. Add MONGODB_URI to your environment, then try again.</p> : notes.length === 0 ? <p className="notes-status">Your first note will appear here.</p> : <section className="notes-grid" aria-label="Previous love notes">{notes.map(note => <article key={note._id} className={`note-${note.recipient || 'deborah'}`}><div className="note-top"><span className="recipient-badge">{note.recipient === 'brume' ? '♠ FOR BRUME' : '♡ FOR DEBORAH'}</span><span className="note-actions"><button aria-label="Edit note" onClick={() => requestAction(note, 'edit')}><Pencil size={14}/></button><button aria-label="Delete note" onClick={() => requestAction(note, 'delete')}><Trash2 size={14}/></button></span></div><p>{note.message}</p><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</time></article>)}</section>}
    {codePrompt && <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setCodePrompt(null)}><form className="code-modal" onSubmit={confirmAction} role="dialog" aria-modal="true" aria-labelledby="code-title"><span>{codePrompt.note.recipient === 'brume' ? '♠' : '♡'}</span><h2 id="code-title">{codePrompt.action === 'delete' ? 'Delete this note?' : 'Edit this note'}</h2><p>{codePrompt.note.recipient === 'brume' ? 'Only Deborah can change notes for Brume.' : 'Only Brume can change notes for Deborah.'}</p>{codePrompt.action === 'edit' && <textarea maxLength={500} value={editing} onChange={event => setEditing(event.target.value)} aria-label="Edited note"/>}<input type="password" inputMode="numeric" autoFocus placeholder="Enter your 4-digit code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))}/>{actionError && <small>{actionError}</small>}<div><button type="button" onClick={() => setCodePrompt(null)}>Cancel</button><button className="confirm" disabled={code.length !== 4 || (codePrompt.action === 'edit' && !editing.trim())}>{codePrompt.action === 'delete' ? 'Delete note' : 'Save changes'}</button></div></form></div>}
  </main>
}
