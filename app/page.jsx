'use client'

import { Component, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Copy, Gamepad2, Heart, Home, Layers3, Link2, Mail, Pencil, RotateCcw, Sparkles, Trash2, Trophy, Users } from 'lucide-react'

const suits = [
  { symbol: '♠', name: 'spades', color: 'black' }, { symbol: '♥', name: 'hearts', color: 'red' },
  { symbol: '♦', name: 'diamonds', color: 'red' }, { symbol: '♣', name: 'clubs', color: 'black' },
]
const ranks = [
  { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }, { label: '5', value: 5 },
  { label: '6', value: 6 }, { label: '7', value: 7 }, { label: '8', value: 8 }, { label: '9', value: 9 },
  { label: '10', value: 10 }, { label: 'J', value: 11 }, { label: 'Q', value: 12 }, { label: 'K', value: 13 }, { label: 'A', value: 14 },
]

const deck = ranks.flatMap(rank => suits.map(suit => ({ ...rank, ...suit })))

function shuffle(cards) {
  const shuffled = cards.map(card => ({ ...card }))
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }
  return shuffled
}

function dealRound(score, remainingCards = deck) {
  const shuffled = shuffle(remainingCards)
  const [you, deborah, ...remaining] = shuffled
  if (!deborah) return null

  return { score, bet: INITIAL_STAKE, committed: { you: INITIAL_STAKE, deborah: INITIAL_STAKE }, cards: { you, deborah }, remainingCards: remaining, revealed: false, phase: 'betting', turn: 'deborah', roundResult: null, message: 'The opening stake is ₦100 each. Bluff, raise, accept, or fold.' }
}

const INITIAL_STAKE = 100
const newGame = () => dealRound({ you: 0, deborah: 0 })

const storage = {
  get(key) {
    try { return window.localStorage.getItem(key) }
    catch { return null }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value) }
    catch { /* The app still works when storage is unavailable. */ }
  },
  remove(key) {
    try { window.localStorage.removeItem(key) }
    catch { /* Nothing to clear when storage is unavailable. */ }
  },
}

function loadGame() {
  const saved = storage.get('deborah-game')
  if (!saved) return newGame()

  try {
    const game = JSON.parse(saved)
    const validCard = card => card && typeof card.value === 'number' && typeof card.label === 'string'
    const validScore = game?.score && Number.isFinite(game.score.you) && Number.isFinite(game.score.deborah)
    if (!validScore || !Number.isFinite(game.bet) || !validCard(game.cards?.you) || !validCard(game.cards?.deborah)) throw new Error('Invalid saved game')
    const bet = game.phase ? game.bet : INITIAL_STAKE
    const committed = game.committed && Number.isFinite(game.committed.you) && Number.isFinite(game.committed.deborah) ? game.committed : { you: bet, deborah: bet }
    const cardKey = card => `${card.label}-${card.name}`
    const dealtCards = new Set([cardKey(game.cards.you), cardKey(game.cards.deborah)])
    const remainingCards = Array.isArray(game.remainingCards) ? game.remainingCards : deck.filter(card => !dealtCards.has(cardKey(card)))
    return { ...game, bet, committed, remainingCards, phase: game.phase || (game.revealed ? 'complete' : 'betting'), turn: game.turn || 'deborah' }
  } catch {
    storage.remove('deborah-game')
    return newGame()
  }
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { crashed: false }
  }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  render() {
    if (!this.state.crashed) return this.props.children
    return <main className="crash-page"><div><Heart size={34} fill="currentColor"/><h1>Let’s try that again.</h1><p>Something unexpected happened, but your little corner is still here.</p><button className="primary" onClick={() => { storage.remove('deborah-game'); window.location.reload() }}>Restart the app</button></div></main>
  }
}

function updateGame(game, action) {
  if (action.type === 'RESET') return { ...newGame(), message: 'Score cleared. Fresh start!' }
  if (action.type === 'PLAY' && game.phase === 'complete') return dealRound(game.score, game.remainingCards) || game
  if (game.phase !== 'betting' || action.actor !== game.turn) return game
  const otherPlayer = action.actor === 'deborah' ? 'you' : 'deborah'
  const committed = game.committed || { you: game.bet, deborah: game.bet }
  if (action.type === 'RAISE') {
    if (game.bet >= 10000000) return game
    const amount = Math.max(1, Math.min(10000000 - game.bet, Math.round(Number(action.amount) || 1)))
    const bet = game.bet + amount
    const match = Math.max(0, game.bet - committed[action.actor])
    return { ...game, bet, committed: { ...committed, [action.actor]: bet }, turn: otherPlayer, message: `${action.actor === 'deborah' ? 'Deborah' : 'Brume'} matches ₦${match.toLocaleString()} and adds ₦${amount.toLocaleString()}. The stake is now ₦${bet.toLocaleString()} each to continue.` }
  }
  if (action.type === 'FOLD') {
    const loss = committed[action.actor]
    return { ...game, phase: 'complete', roundResult: { winner: otherPlayer, amount: loss, reason: 'fold' }, score: { ...game.score, [otherPlayer]: game.score[otherPlayer] + loss }, message: `${action.actor === 'deborah' ? 'Deborah' : 'Brume'} folds and loses only the ₦${loss.toLocaleString()} already committed. ${otherPlayer === 'deborah' ? 'Deborah' : 'Brume'}'s unmatched raise is not charged.` }
  }
  if (action.type !== 'ACCEPT') return game
  const matched = { ...committed, [action.actor]: game.bet }
  const difference = game.cards.you.value - game.cards.deborah.value
  if (!difference) return { ...game, committed: matched, phase: 'complete', revealed: true, roundResult: { winner: null, amount: 0, reason: 'tie' }, message: "Stake accepted. It's a tie — nobody owes a thing!" }
  const winner = difference > 0 ? 'you' : 'deborah'
  const loser = winner === 'you' ? 'deborah' : 'you'
  return { ...game, committed: matched, phase: 'complete', revealed: true, roundResult: { winner, amount: matched[loser], reason: 'cards' }, score: { ...game.score, [winner]: game.score[winner] + matched[loser] }, message: difference > 0 ? `Stake accepted. Brume wins ₦${matched[loser].toLocaleString()}!` : `Stake accepted. Deborah wins ₦${matched[loser].toLocaleString()}!` }
}

function roundMessage(game, player) {
  if (game.phase !== 'complete' || !game.roundResult) return game.message
  const { winner, amount, reason } = game.roundResult
  if (!winner) return "It's a tie — nobody owes a thing!"
  const winnerName = winner === 'you' ? 'Brume' : 'Deborah'
  const subject = player && player === (winner === 'you' ? 'brume' : 'deborah') ? 'You have' : `${winnerName} has`
  return `${subject} won ₦${amount.toLocaleString()}${reason === 'fold' ? ' by fold' : ''}!`
}

function balanceMessage(balance, player) {
  if (balance === 0) return 'All square'
  const amount = Math.abs(balance).toLocaleString()
  if (balance > 0) {
    if (player === 'brume') return `Deborah owes you ₦${amount}`
    if (player === 'deborah') return `You owe Brume ₦${amount}`
    return `Deborah owes Brume ₦${amount}`
  }
  if (player === 'deborah') return `Brume owes you ₦${amount}`
  if (player === 'brume') return `You owe Deborah ₦${amount}`
  return `Brume owes Deborah ₦${amount}`
}

function Nav({ page, setPage }) {
  return <header className="nav-wrap"><nav className="nav shell" aria-label="Main navigation">
    <button className="brand" onClick={() => setPage('home')} aria-label="Deborah, home"><span>D</span><strong>Deborah</strong></button>
    <div className="nav-links">
      <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}><Home size={16}/> Home</button>
      <button className={page.startsWith('game') ? 'active' : ''} onClick={() => setPage('games')}><Gamepad2 size={16}/> Games</button>
      <button className={page === 'notes' ? 'active' : ''} onClick={() => setPage('notes')}><Mail size={16}/> Notes</button>
    </div>
    <button className="love-note-link" onClick={() => setPage('notes')}><Mail size={16}/> Love notes</button>
  </nav></header>
}

function RecipientPicker({ value, onChange }) {
  return <fieldset className="recipient-picker"><legend>This note is for</legend><button type="button" className={value === 'deborah' ? 'selected her' : ''} onClick={() => onChange('deborah')}>♡ Deborah</button><button type="button" className={value === 'brume' ? 'selected him' : ''} onClick={() => onChange('brume')}>♠ Brume</button></fieldset>
}

function HomePage({ setPage }) {
  const [note, setNote] = useState(() => storage.get('deborah-note') || '')
  const [recipient, setRecipient] = useState('deborah')
  const [saved, setSaved] = useState(false)
  const saveNote = async () => {
    storage.set('deborah-note', note)
    try {
      const response = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: note, recipient }) })
      if (!response.ok) throw new Error('Save failed')
      setNote(''); storage.remove('deborah-note'); setSaved(true); setTimeout(() => setSaved(false), 1800)
    } catch { setPage('notes') }
  }
  return <main>
    <section className="hero shell">
      <div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/> A corner of the internet, just for us</div><h1>Welcome, <em>Deborah.</em></h1><p className="lead">I made this little place to hold our favorite memories, silly games, and all the words I never want to leave unsaid.</p><div className="hero-actions"><button className="primary" onClick={() => setPage('games')}>Play a game <ArrowRight size={18}/></button><button className="secondary" onClick={() => setPage('notes')}>Leave a love note</button></div><div className="promise"><Heart size={18} fill="currentColor"/><span><strong>Made with intention</strong><small>For the quiet days, loud laughs, and everything in between.</small></span></div></div>
      <div className="hero-art" aria-label="A love letter for Deborah"><div className="orbit orbit-one">✦</div><div className="orbit orbit-two">♡</div><div className="letter"><div className="letter-stamp">D</div><span>my dearest</span><h2>For you,<br/>always.</h2><p>— with all my love</p></div><div className="flower f1">✿</div><div className="flower f2">❀</div><div className="flower f3">✿</div></div>
    </section>
    <section className="moments shell"><div><span className="section-kicker">OURS TO KEEP</span><h2>Little things, big love.</h2></div><div className="moment-grid"><article><span>01</span><h3>Play together</h3><p>Settle the score with a quick round of Higher or Lower.</p><button onClick={() => setPage('games')}>Open games <ArrowRight size={15}/></button></article><article><span>02</span><h3>Write it down</h3><p>Leave a note for the words worth keeping close.</p><button onClick={() => setPage('notes')}>Write a note <ArrowRight size={15}/></button></article><article><span>03</span><h3>More to come</h3><p>This is only the first page of something that keeps growing.</p><div className="soon">SOON, MY LOVE</div></article></div></section>
    <section className="notes-section" id="notes"><div className="shell note-layout"><div><span className="section-kicker">A NOTE FOR US</span><h2>Some things deserve<br/>to be written down.</h2><p>Your note joins your private shared archive, ready whenever you come back.</p></div><div className="note-card"><RecipientPicker value={recipient} onChange={setRecipient}/><label htmlFor="love-note">My love,</label><textarea id="love-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Today I wanted to remind you that…" maxLength={500}/><div><small>{note.length} / 500</small><button onClick={saveNote} disabled={!note.trim()}>{saved ? 'Saved with love ♥' : 'Keep this note'} <Heart size={15}/></button></div></div></div></section>
  </main>
}

function NotesPage() {
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

function PlayingCard({ card, hidden, label }) {
  if (hidden) return <div className="playing-card card-back" aria-label={`${label} hidden card`}><div>♥</div><span>FOR<br/>US</span></div>
  return <div className={`playing-card ${card.color}`} aria-label={`${card.label} of ${card.name}`}><div className="corner"><b>{card.label}</b><i>{card.symbol}</i></div><div className="suit">{card.symbol}</div><div className="corner bottom"><b>{card.label}</b><i>{card.symbol}</i></div></div>
}

function HigherLowerGame({ onBack }) {
  const [game, setGame] = useState(loadGame)
  const [raiseAmount, setRaiseAmount] = useState(100)
  const [online, setOnline] = useState({ role: 'local', status: 'offline', code: '', error: '' })
  const [player, setPlayer] = useState(() => storage.get('deborah-player') || '')
  const [savedRoom, setSavedRoom] = useState(() => {
    try {
      const room = JSON.parse(storage.get('deborah-room'))
      return room && Date.now() - room.lastActive < 24 * 60 * 60 * 1000 ? room : null
    } catch { return null }
  })
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const gameRef = useRef(game)

  useEffect(() => { gameRef.current = game; storage.set('deborah-game', JSON.stringify(game)) }, [game])
  useEffect(() => {
    if (!player) return
    storage.set('deborah-player', player)
    if (online.role !== 'local') {
      const room = { role: online.role, code: online.code, player, lastActive: Date.now() }
      storage.set('deborah-room', JSON.stringify(room)); setSavedRoom(room)
    }
  }, [online.role, online.code, online.status, player])
  useEffect(() => {
    if (online.role === 'local' || !online.code) return
    let active = true
    const sync = async () => {
      try {
        const response = await fetch(`/api/rooms?code=${encodeURIComponent(online.code)}&player=${player}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(response.status === 404 ? 'This room expired or no longer exists.' : 'Connection lost. Reconnecting…')
        const data = await response.json()
        if (active) { gameRef.current = data.game; setGame(data.game); setOnline(current => ({ ...current, status: current.role === 'host' && !data.ready ? 'waiting' : 'connected', error: '' })) }
      } catch (error) {
        if (active) setOnline(current => ({ ...current, status: 'connecting', error: error.message }))
      }
    }
    sync()
    const timer = setInterval(sync, 1500)
    const resume = () => document.visibilityState === 'visible' && sync()
    document.addEventListener('visibilitychange', resume)
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', resume) }
  }, [online.role, online.code, player])

  const hostGame = async () => {
    if (!player) return
    setOnline({ role: 'host', status: 'connecting', code: '', error: '' })
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')
      try {
        const response = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, game: gameRef.current, player }) })
        if (response.status === 409) continue
        if (!response.ok) throw new Error()
        setOnline({ role: 'host', status: 'waiting', code, error: '' }); return
      } catch { setOnline({ role: 'local', status: 'error', code: '', error: 'Could not create a room. Check the database connection and try again.' }); return }
    }
  }

  const joinGame = async (roomCode) => {
    const code = (typeof roomCode === 'string' ? roomCode : joinCode).trim().replace(/[^a-z0-9]/gi, '').toUpperCase()
    if (!code || !player) return
    setOnline({ role: 'guest', status: 'connecting', code, error: '' })
    try {
      const response = await fetch(`/api/rooms?code=${encodeURIComponent(code)}&player=${player}`, { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const data = await response.json(); gameRef.current = data.game; setGame(data.game)
      setOnline({ role: 'guest', status: 'connected', code, error: '' })
    } catch { setOnline({ role: 'local', status: 'error', code: '', error: 'Room not found. Check the code and try again.' }) }
  }

  const dispatch = async action => {
    if (action.type === 'PLAY') {
      const nextRound = dealRound(gameRef.current.score, gameRef.current.remainingCards)
      if (!nextRound) return
      action = { ...action, game: nextRound }
    }
    if (action.type === 'RESET') action = { ...action, game: { ...newGame(), message: 'Score cleared. Fresh start!' } }
    if (online.role !== 'local') {
      if (online.status !== 'connected') return
      try {
        const response = await fetch('/api/rooms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: online.code, action }) })
        if (!response.ok) throw new Error()
        const data = await response.json(); gameRef.current = data.game; setGame(data.game)
      } catch { setOnline(current => ({ ...current, status: 'connecting', error: 'Connection lost. Reconnecting…' })) }
      return
    }
    const next = updateGame(gameRef.current, action)
    gameRef.current = next
    setGame(next)
  }

  const leaveRoom = () => { storage.remove('deborah-room'); setSavedRoom(null); setOnline({ role: 'local', status: 'offline', code: '', error: '' }) }
  const returnToRoom = () => {
    if (!savedRoom) return
    setPlayer(savedRoom.player)
    setJoinCode(savedRoom.code); joinGame(savedRoom.code)
  }
  const { score, bet, committed = { you: bet, deborah: bet }, cards, remainingCards = [], revealed, phase, turn } = game
  const actor = online.role === 'local' ? turn : player === 'deborah' ? 'deborah' : 'you'
  const canAct = phase === 'betting' && actor === turn && (online.role === 'local' || online.status === 'connected')
  const amountToMatch = Math.max(0, bet - committed[actor])
  const balance = score.you - score.deborah
  return <main className="game-page shell"><button className="back-to-games" onClick={onBack}><ArrowLeft size={16}/> All games</button><div className="game-heading"><span className="section-kicker">DATE NIGHT ARCADE</span><h1>Higher or Lower</h1><p>One draw from a 52-card deck. Highest card wins. Ace is high.</p></div>
    <section className="online-panel">
      <div className="online-intro"><span><Users size={18}/> PLAY FROM ANYWHERE</span><p>Rooms work across different Wi-Fi and mobile networks and remain available for 24 hours.</p></div>
      {online.role === 'local' ? <div className="online-setup"><div className="player-picker" aria-label="Choose player"><button className={player === 'brume' ? 'selected' : ''} onClick={() => setPlayer('brume')}>I’m Brume</button><button className={player === 'deborah' ? 'selected' : ''} onClick={() => setPlayer('deborah')}>I’m Deborah</button></div>{savedRoom && <button className="return-room" onClick={returnToRoom}>{savedRoom.player === 'brume' ? 'Brume' : 'Deborah'} is returning to {savedRoom.code}</button>}<div className="room-actions"><button className="host-button" onClick={() => hostGame()} disabled={!player}><Link2 size={16}/> Start a room</button><span>or</span><div className="join-control"><input aria-label="Room code" value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} onKeyDown={event => event.key === 'Enter' && joinGame()} placeholder="ROOM CODE" maxLength={6}/><button onClick={joinGame} disabled={!player}>Join</button></div></div></div> : <div className="room-status"><div><small>{online.status === 'connected' ? `${player.toUpperCase()} — GAME IS LIVE` : online.status === 'waiting' ? `WAITING FOR ${player === 'brume' ? 'DEBORAH' : 'BRUME'}` : online.status.toUpperCase()}</small><strong>{online.code}</strong></div>{online.status === 'waiting' && <button className="copy-code" onClick={() => { navigator.clipboard.writeText(online.code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy code'}</button>}<button className="leave" onClick={leaveRoom}>Leave room</button></div>}
      {online.error && <p className="connection-error">{online.error}</p>}
    </section>
    <section className="game-board">
      <div className="scorebar"><div><small>BRUME HAS WON</small><strong>₦{score.you.toLocaleString()}</strong></div><span className="heart-chip">♥</span><div><small>DEBORAH HAS WON</small><strong>₦{score.deborah.toLocaleString()}</strong></div></div>
      <div className="table"><div className="player"><span>BRUME</span><PlayingCard card={cards.you} hidden={!revealed && online.role !== 'local' && player !== 'brume'} label="Brume's"/></div><div className="versus">VS</div><div className="player"><span>DEBORAH</span><PlayingCard card={cards.deborah} hidden={!revealed && (online.role === 'local' || player !== 'deborah')} label="Deborah's"/></div></div>
      <div className={`result ${phase === 'complete' ? 'show' : ''}`}>{roundMessage(game, player)}</div>
      <div className="deck-tracker" aria-label={`${remainingCards.length} cards left in the deck`}><span className="mini-deck">♠</span><div><strong>{remainingCards.length} cards left</strong><small>Remaining deck reshuffles before every deal</small></div><div className="discard-pile"><span>PLAYED PILE</span><b>{deck.length - remainingCards.length}</b></div></div>
      {phase === 'betting' ? <div className="wager-controls"><div className="stake-total"><small>CURRENT STAKE</small><strong>₦{bet.toLocaleString()}</strong><span>{turn === 'deborah' ? "Deborah's decision" : "Brume's decision"} · ₦{committed[actor].toLocaleString()} committed</span></div><div className="raise-control"><label htmlFor="raise">Add after matching</label><span>₦<input id="raise" type="number" min="1" max="9999900" value={raiseAmount} onChange={event => setRaiseAmount(event.target.value)}/></span></div><div className="wager-actions"><button className="fold" disabled={!canAct} onClick={() => dispatch({ type: 'FOLD', actor })}>Fold (lose ₦{committed[actor].toLocaleString()})</button><button className="raise" disabled={!canAct} onClick={() => dispatch({ type: 'RAISE', actor, amount: raiseAmount })}>Match ₦{amountToMatch.toLocaleString()} &amp; add ₦{Number(raiseAmount || 0).toLocaleString()}</button><button className="primary accept" disabled={!canAct} onClick={() => dispatch({ type: 'ACCEPT', actor })}>{amountToMatch ? `Match ₦${amountToMatch.toLocaleString()} & show cards` : 'Show cards'} <Sparkles size={16}/></button></div></div> : remainingCards.length ? <div className="controls"><button className="primary deal" onClick={() => dispatch({ type: 'PLAY' })}>Shuffle &amp; deal next round <Sparkles size={17}/></button></div> : <div className="game-over"><Sparkles size={19}/><div><strong>Game over — the deck is finished.</strong><span>Reset the score to shuffle all 52 cards and play again.</span></div></div>}
    </section>
    <div className="balance"><div><span>RUNNING BALANCE</span><strong>{balanceMessage(balance, player)}</strong></div><button onClick={() => dispatch({ type: 'RESET' })}><RotateCcw size={15}/> Reset score</button></div>
    <p className="local-note">{online.status === 'connected' ? 'Both devices are synchronized live. Take turns raising, accepting, or folding.' : 'Pass the device to take turns, or start a private room to bluff on two devices.'}</p>
  </main>
}

const whotShapes = [
  { name: 'circle', symbol: '●', color: '#cf4d58' }, { name: 'triangle', symbol: '▲', color: '#4c7392' },
  { name: 'cross', symbol: '✚', color: '#ad6d35' }, { name: 'square', symbol: '■', color: '#667b55' }, { name: 'star', symbol: '★', color: '#936785' },
]
const makeWhotDeck = () => [...whotShapes.flatMap(shape => [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14].map(number => ({ ...shape, number, id: `${shape.name}-${number}-${Math.random()}` }))), ...Array.from({ length: 5 }, (_, index) => ({ name: 'whot', symbol: 'W', number: 20, color: '#803f45', id: `whot-${index}-${Math.random()}` }))]
const canPlayWhot = (card, top, calledShape) => card.name === 'whot' || card.number === top.number || card.name === (calledShape || top.name)
const whotCardLabel = card => card.name === 'whot' ? 'WHOT 20' : `${card.number} ${card.name}`

function WhotCard({ card, hidden = false, playable = false, onClick, entering = false }) {
  if (hidden) return <div className="whot-card whot-back" aria-label="Hidden Whot card"><Heart fill="currentColor"/></div>
  return <button className={`whot-card ${playable ? 'playable' : ''} ${entering ? 'card-entering' : ''}`} style={{ '--card-color': card.color }} onClick={onClick} disabled={!onClick} aria-label={whotCardLabel(card)}><b>{card.number}</b><span>{card.symbol}</span><i>{card.name === 'whot' ? 'WHOT' : card.name}</i><b className="whot-bottom">{card.number}</b></button>
}

function createWhotGame() {
  const cards = shuffle(makeWhotDeck()); const top = cards.pop()
  return { hands: { brume: cards.splice(0, 7), deborah: cards.splice(0, 7) }, pile: [top], deck: cards, turn: 'brume', calledShape: '', winner: '', message: "Brume, you're up. Match the shape or number.", motion: 'deal' }
}

function WhotGame({ onBack }) {
  const [game, setGame] = useState(createWhotGame)
  const [choosing, setChoosing] = useState(null)
  const [motionCard, setMotionCard] = useState(null)
  const top = game.pile.at(-1)
  const nextPlayer = player => player === 'brume' ? 'deborah' : 'brume'
  const finishPlay = (player, card, shape = '') => {
    setGame(current => {
      const hand = current.hands[player].filter(item => item.id !== card.id)
      const winner = hand.length === 0 ? player : ''
      return { ...current, hands: { ...current.hands, [player]: hand }, pile: [...current.pile, card], turn: winner ? player : nextPlayer(player), calledShape: card.name === 'whot' ? shape : '', winner, message: winner ? `${player === 'brume' ? 'Brume' : 'Deborah'} wins the round!` : `${nextPlayer(player) === 'brume' ? 'Brume' : 'Deborah'}, your turn.`, motion: 'play' }
    })
    setMotionCard(card.id); setTimeout(() => setMotionCard(null), 500)
  }
  const play = (player, card) => {
    if (game.winner || player !== game.turn || !canPlayWhot(card, top, game.calledShape)) return
    if (card.name === 'whot') { setChoosing({ player, card }); return }
    finishPlay(player, card)
  }
  const draw = player => {
    if (game.winner || player !== game.turn) return
    setGame(current => {
      let deckCards = [...current.deck]
      let pile = current.pile
      if (!deckCards.length && pile.length > 1) { deckCards = shuffle(pile.slice(0, -1)); pile = pile.slice(-1) }
      const card = deckCards.pop()
      if (!card) return current
      const next = nextPlayer(player)
      return { ...current, deck: deckCards, pile, hands: { ...current.hands, [player]: [...current.hands[player], card] }, turn: next, message: `${player === 'brume' ? 'Brume' : 'Deborah'} drew a card. ${next === 'brume' ? 'Brume' : 'Deborah'} is up.`, motion: 'draw' }
    })
  }
  return <main className="whot-page shell"><button className="back-to-games" onClick={onBack}><ArrowLeft size={16}/> All games</button><div className="game-heading"><span className="section-kicker">A NIGERIAN CLASSIC</span><h1>Whot</h1><p>Match the shape or number. Play a Whot card to call the next shape.</p></div>
    <section className={`whot-table motion-${game.motion}`}>
      <div className="whot-status"><span className={game.turn === 'deborah' ? 'active' : ''}>DEBORAH · {game.hands.deborah.length} CARDS</span><strong>{game.winner ? <><Trophy size={18}/> {game.message}</> : game.message}</strong><span className={game.turn === 'brume' ? 'active' : ''}>BRUME · {game.hands.brume.length} CARDS</span></div>
      <div className="whot-hand opponent" aria-label="Deborah's hand">{game.hands.deborah.map(card => <WhotCard key={card.id} card={card} playable={game.turn === 'deborah' && canPlayWhot(card, top, game.calledShape)} onClick={game.turn === 'deborah' ? () => play('deborah', card) : undefined}/>)}</div>
      <div className="whot-center"><button className="draw-pile" onClick={() => draw(game.turn)} disabled={!!game.winner}><span>{game.deck.length}</span><small>DRAW</small></button><div className="discard"><WhotCard card={top} entering={motionCard === top.id}/>{game.calledShape && <span className="called-shape">Called: {whotShapes.find(shape => shape.name === game.calledShape)?.symbol} {game.calledShape}</span>}</div></div>
      <div className="whot-hand" aria-label="Brume's hand">{game.hands.brume.map(card => <WhotCard key={card.id} card={card} playable={game.turn === 'brume' && canPlayWhot(card, top, game.calledShape)} onClick={game.turn === 'brume' ? () => play('brume', card) : undefined}/>)}</div>
      {game.winner && <button className="primary whot-again" onClick={() => { setGame(createWhotGame()); setChoosing(null) }}><RotateCcw size={16}/> Play again</button>}
    </section>
    {choosing && <div className="modal-backdrop"><div className="shape-modal" role="dialog" aria-modal="true"><Sparkles/><h2>Call a shape</h2><p>What must the next player match?</p><div>{whotShapes.map(shape => <button key={shape.name} style={{ '--shape-color': shape.color }} onClick={() => { finishPlay(choosing.player, choosing.card, shape.name); setChoosing(null) }}><span>{shape.symbol}</span>{shape.name}</button>)}</div></div></div>}
    <aside className="whot-rules"><strong>QUICK RULES</strong><span>Match shape</span><i>or</i><span>Match number</span><i>or</i><span>Play WHOT</span></aside>
  </main>
}

function GamesGallery({ openGame }) {
  return <main className="games-gallery shell"><div className="gallery-heading"><span className="section-kicker">JUST THE TWO OF US</span><h1>Pick a game.</h1><p>A tiny date-night arcade for quiet evenings, loud laughs, and playful rivalries.</p></div><section className="game-grid">
    <article className="game-tile higher-tile"><div className="tile-art"><div className="floating-card card-one">A<span>♥</span></div><div className="floating-card card-two">K<span>♠</span></div><Sparkles/></div><div className="tile-copy"><span className="game-tag">CARDS · BLUFFING</span><h2>Higher or Lower</h2><p>Raise the stakes, call the bluff, and see whose card comes out on top.</p><button className="primary" onClick={() => openGame('game-higher')}>Play now <ArrowRight size={17}/></button></div></article>
    <article className="game-tile whot-tile"><div className="tile-art"><div className="whot-preview"><b>20</b><span>W</span><i>WHOT</i></div><div className="shape-rain"><span>●</span><span>▲</span><span>★</span><span>■</span></div></div><div className="tile-copy"><span className="game-tag">CLASSIC · STRATEGY</span><h2>Whot</h2><p>Match shapes and numbers, call your suit, and race to empty your hand.</p><button className="primary" onClick={() => openGame('game-whot')}>Play now <ArrowRight size={17}/></button></div></article>
  </section><div className="gallery-note"><Layers3 size={18}/><span><strong>Made for passing the phone.</strong> Take turns, keep your hand close, and play fair-ish.</span></div></main>
}

export default function App() {
  const [page, setPage] = useState('home')
  return <AppErrorBoundary><Nav page={page} setPage={setPage}/>{page === 'home' ? <HomePage setPage={setPage}/> : page === 'games' ? <GamesGallery openGame={setPage}/> : page === 'game-higher' ? <HigherLowerGame onBack={() => setPage('games')}/> : page === 'game-whot' ? <WhotGame onBack={() => setPage('games')}/> : <NotesPage/>}<footer><div className="shell">Made for Deborah <span>♥</span><small>One little website. A whole lot of love.</small></div></footer></AppErrorBoundary>
}
