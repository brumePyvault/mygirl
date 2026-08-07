'use client'

import { Component, useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { ArrowRight, Check, Copy, Gamepad2, Heart, Home, Link2, Mail, RotateCcw, Sparkles, Users } from 'lucide-react'

const suits = [
  { symbol: '♠', name: 'spades', color: 'black' }, { symbol: '♥', name: 'hearts', color: 'red' },
  { symbol: '♦', name: 'diamonds', color: 'red' }, { symbol: '♣', name: 'clubs', color: 'black' },
]
const ranks = [
  { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }, { label: '5', value: 5 },
  { label: '6', value: 6 }, { label: '7', value: 7 }, { label: '8', value: 8 }, { label: '9', value: 9 },
  { label: '10', value: 10 }, { label: 'J', value: 11 }, { label: 'Q', value: 12 }, { label: 'K', value: 13 }, { label: 'A', value: 14 },
]

const drawCard = () => ({ ...ranks[Math.floor(Math.random() * ranks.length)], ...suits[Math.floor(Math.random() * suits.length)] })
const newGame = () => ({ score: { you: 0, deborah: 0 }, bet: 5, cards: { you: drawCard(), deborah: drawCard() }, revealed: false, message: 'Choose the stake, then reveal the cards.' })

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
    return game
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
  if (action.type === 'BET') return { ...game, bet: Math.max(1, game.bet + action.amount) }
  if (action.type === 'SET_BET') return { ...game, bet: Math.max(1, Math.min(10000000, Math.round(Number(action.amount) || 1))) }
  if (action.type === 'RESET') return { ...newGame(), message: 'Score cleared. Fresh start!' }
  if (action.type !== 'PLAY') return game
  if (game.revealed) return { ...game, cards: { you: drawCard(), deborah: drawCard() }, revealed: false, message: 'Choose the stake, then reveal the cards.' }
  const difference = game.cards.you.value - game.cards.deborah.value
  if (!difference) return { ...game, revealed: true, message: "It's a tie — nobody owes a thing!" }
  const winner = difference > 0 ? 'you' : 'deborah'
  return { ...game, revealed: true, score: { ...game.score, [winner]: game.score[winner] + game.bet }, message: difference > 0 ? `You win ₦${game.bet.toLocaleString()} this round!` : `Deborah wins ₦${game.bet.toLocaleString()} this round!` }
}

function Nav({ page, setPage }) {
  return <header className="nav-wrap"><nav className="nav shell" aria-label="Main navigation">
    <button className="brand" onClick={() => setPage('home')} aria-label="Deborah, home"><span>D</span><strong>Deborah</strong></button>
    <div className="nav-links">
      <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}><Home size={16}/> Home</button>
      <button className={page === 'games' ? 'active' : ''} onClick={() => setPage('games')}><Gamepad2 size={16}/> Games</button>
      <button className={page === 'notes' ? 'active' : ''} onClick={() => setPage('notes')}><Mail size={16}/> Notes</button>
    </div>
    <button className="love-note-link" onClick={() => setPage('notes')}><Mail size={16}/> Love notes</button>
  </nav></header>
}

function HomePage({ setPage }) {
  const [note, setNote] = useState(() => storage.get('deborah-note') || '')
  const [saved, setSaved] = useState(false)
  const saveNote = async () => {
    storage.set('deborah-note', note)
    try {
      const response = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: note }) })
      if (!response.ok) throw new Error('Save failed')
      setNote(''); storage.remove('deborah-note'); setSaved(true); setTimeout(() => setSaved(false), 1800)
    } catch { setPage('notes') }
  }
  return <main>
    <section className="hero shell">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={15}/> A corner of the internet, just for us</div>
        <h1>Welcome, <em>Deborah.</em></h1>
        <p className="lead">I made this little place to hold our favorite memories, silly games, and all the words I never want to leave unsaid.</p>
        <div className="hero-actions"><button className="primary" onClick={() => setPage('games')}>Play a game <ArrowRight size={18}/></button><button className="secondary" onClick={() => setPage('notes')}>Leave a love note</button></div>
        <div className="promise"><Heart size={18} fill="currentColor"/><span><strong>Made with intention</strong><small>For the quiet days, loud laughs, and everything in between.</small></span></div>
      </div>
      <div className="hero-art" aria-label="A love letter for Deborah">
        <div className="orbit orbit-one">✦</div><div className="orbit orbit-two">♡</div>
        <div className="letter"><div className="letter-stamp">D</div><span>my dearest</span><h2>For you,<br/>always.</h2><p>— with all my love</p></div>
        <div className="flower f1">✿</div><div className="flower f2">❀</div><div className="flower f3">✿</div>
      </div>
    </section>
    <section className="moments shell">
      <div><span className="section-kicker">OURS TO KEEP</span><h2>Little things, big love.</h2></div>
      <div className="moment-grid"><article><span>01</span><h3>Play together</h3><p>Settle the score with a quick round of Higher or Lower.</p><button onClick={() => setPage('games')}>Open games <ArrowRight size={15}/></button></article><article><span>02</span><h3>Write it down</h3><p>Leave a note for the words worth keeping close.</p><button onClick={() => setPage('notes')}>Write a note <ArrowRight size={15}/></button></article><article><span>03</span><h3>More to come</h3><p>This is only the first page of something that keeps growing.</p><div className="soon">SOON, MY LOVE</div></article></div>
    </section>
    <section className="notes-section" id="notes"><div className="shell note-layout"><div><span className="section-kicker">A NOTE FOR DEBORAH</span><h2>Some things deserve<br/>to be written down.</h2><p>Your note joins your private shared archive, ready whenever you come back.</p></div><div className="note-card"><label htmlFor="love-note">My love,</label><textarea id="love-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Today I wanted to remind you that…" maxLength={500}/><div><small>{note.length} / 500</small><button onClick={saveNote} disabled={!note.trim()}>{saved ? 'Saved with love ♥' : 'Keep this note'} <Heart size={15}/></button></div></div></div></section>
  </main>
}

function NotesPage() {
  const [notes, setNotes] = useState([])
  const [message, setMessage] = useState(() => storage.get('deborah-note') || '')
  const [status, setStatus] = useState('loading')
  const loadNotes = async () => {
    try { const response = await fetch('/api/notes'); if (!response.ok) throw new Error(); setNotes((await response.json()).notes); setStatus('ready') }
    catch { setStatus('error') }
  }
  useEffect(() => { loadNotes() }, [])
  const submit = async event => {
    event.preventDefault(); setStatus('saving')
    try {
      const response = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
      if (!response.ok) throw new Error()
      setMessage(''); storage.remove('deborah-note'); await loadNotes()
    } catch { storage.set('deborah-note', message); setStatus('error') }
  }
  return <main className="notes-page shell"><div className="notes-heading"><span className="section-kicker">OUR LOVE, IN WORDS</span><h1>Notes worth keeping.</h1><p>A shared little archive, saved safely for both of you.</p></div>
    <form className="note-card note-composer" onSubmit={submit}><label htmlFor="new-note">My love,</label><textarea id="new-note" value={message} onChange={event => setMessage(event.target.value)} placeholder="Today I wanted to remind you that…" maxLength={500}/><div><small>{message.length} / 500</small><button disabled={!message.trim() || status === 'saving'}>{status === 'saving' ? 'Keeping…' : 'Keep this note'} <Heart size={15}/></button></div></form>
    {status === 'loading' ? <p className="notes-status">Opening your notes…</p> : status === 'error' ? <p className="notes-status error">The notes backend is unavailable. Add MONGODB_URI to your environment, then try again.</p> : notes.length === 0 ? <p className="notes-status">Your first note will appear here.</p> : <section className="notes-grid" aria-label="Previous love notes">{notes.map(note => <article key={note._id}><Mail size={18}/><p>{note.message}</p><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</time></article>)}</section>}
  </main>
}

function PlayingCard({ card, hidden, label }) {
  if (hidden) return <div className="playing-card card-back" aria-label={`${label} hidden card`}><div>♥</div><span>FOR<br/>US</span></div>
  return <div className={`playing-card ${card.color}`} aria-label={`${card.label} of ${card.name}`}><div className="corner"><b>{card.label}</b><i>{card.symbol}</i></div><div className="suit">{card.symbol}</div><div className="corner bottom"><b>{card.label}</b><i>{card.symbol}</i></div></div>
}

function GamesPage() {
  const [game, setGame] = useState(loadGame)
  const [online, setOnline] = useState({ role: 'local', status: 'offline', code: '', error: '' })
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const peerRef = useRef(null)
  const connectionRef = useRef(null)
  const gameRef = useRef(game)
  const guestView = current => ({ ...current, cards: { you: current.revealed ? current.cards.you : null, deborah: current.cards.deborah } })

  useEffect(() => { gameRef.current = game; storage.set('deborah-game', JSON.stringify(game)) }, [game])
  useEffect(() => () => peerRef.current?.destroy(), [])

  const attachConnection = (connection, role) => {
    connectionRef.current = connection
    connection.on('open', () => {
      setOnline(current => ({ ...current, role, status: 'connected', error: '' }))
      if (role === 'host') connection.send({ type: 'STATE', game: guestView(gameRef.current) })
    })
    connection.on('data', data => {
      if (data.type === 'STATE') setGame(data.game)
      if (data.type === 'ACTION' && role === 'host') {
        const next = updateGame(gameRef.current, data.action)
        gameRef.current = next
        setGame(next)
        connection.send({ type: 'STATE', game: guestView(next) })
      }
    })
    connection.on('close', () => setOnline(current => ({ ...current, status: 'disconnected', error: 'The other player left the room.' })))
    connection.on('error', () => setOnline(current => ({ ...current, status: 'error', error: 'The connection was interrupted. Try joining again.' })))
  }

  const hostGame = () => {
    peerRef.current?.destroy()
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const peer = new Peer(`deborah-${code.toLowerCase()}`)
    peerRef.current = peer
    setOnline({ role: 'host', status: 'waiting', code, error: '' })
    peer.on('connection', connection => attachConnection(connection, 'host'))
    peer.on('error', () => setOnline(current => ({ ...current, status: 'error', error: 'Could not create the room. Please try again.' })))
  }

  const joinGame = () => {
    const code = joinCode.trim().replace(/[^a-z0-9]/gi, '').toUpperCase()
    if (!code) return
    peerRef.current?.destroy()
    const peer = new Peer()
    peerRef.current = peer
    setOnline({ role: 'guest', status: 'connecting', code, error: '' })
    peer.on('open', () => attachConnection(peer.connect(`deborah-${code.toLowerCase()}`, { reliable: true }), 'guest'))
    peer.on('error', () => setOnline(current => ({ ...current, status: 'error', error: 'Room not found. Check the code and try again.' })))
  }

  const dispatch = action => {
    if (online.role === 'guest' && online.status === 'connected') return connectionRef.current?.send({ type: 'ACTION', action })
    const next = updateGame(gameRef.current, action)
    gameRef.current = next
    setGame(next)
    if (online.role === 'host' && online.status === 'connected') connectionRef.current?.send({ type: 'STATE', game: guestView(next) })
  }

  const leaveRoom = () => { peerRef.current?.destroy(); peerRef.current = null; connectionRef.current = null; setOnline({ role: 'local', status: 'offline', code: '', error: '' }) }
  const { score, bet, cards, revealed, message } = game
  const balance = score.you - score.deborah
  return <main className="game-page shell"><div className="game-heading"><span className="section-kicker">DATE NIGHT ARCADE</span><h1>Higher or Lower</h1><p>One draw. Highest card wins. Ace is high.</p></div>
    <section className="online-panel">
      <div className="online-intro"><span><Users size={18}/> PLAY ON TWO DEVICES</span><p>Start a private room and share the six-character code, or join Deborah's room.</p></div>
      {online.role === 'local' ? <div className="room-actions"><button className="host-button" onClick={hostGame}><Link2 size={16}/> Start a room</button><span>or</span><div className="join-control"><input aria-label="Room code" value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} onKeyDown={event => event.key === 'Enter' && joinGame()} placeholder="ROOM CODE" maxLength={6}/><button onClick={joinGame}>Join</button></div></div> : <div className="room-status"><div><small>{online.status === 'connected' ? 'CONNECTED — GAME IS LIVE' : online.status === 'waiting' ? 'WAITING FOR DEBORAH' : online.status.toUpperCase()}</small><strong>{online.code}</strong></div>{online.status === 'waiting' && <button className="copy-code" onClick={() => { navigator.clipboard.writeText(online.code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy code'}</button>}<button className="leave" onClick={leaveRoom}>Leave room</button></div>}
      {online.error && <p className="connection-error">{online.error}</p>}
    </section>
    <section className="game-board">
      <div className="scorebar"><div><small>YOU'VE WON</small><strong>₦{score.you.toLocaleString()}</strong></div><span className="heart-chip">♥</span><div><small>DEBORAH'S WON</small><strong>₦{score.deborah.toLocaleString()}</strong></div></div>
      <div className="table"><div className="player"><span>{online.role === 'guest' ? 'YOUR BABE' : 'YOU'}</span><PlayingCard card={cards.you} hidden={!revealed && online.role === 'guest'} label="Your babe's"/></div><div className="versus">VS</div><div className="player"><span>{online.role === 'guest' ? 'YOU' : 'DEBORAH'}</span><PlayingCard card={cards.deborah} hidden={!revealed && online.role !== 'guest'} label="Deborah's"/></div></div>
      <div className={`result ${revealed ? 'show' : ''}`}>{message}</div>
      <div className="controls"><div className="bet"><label htmlFor="bet">Stake this round</label><div><button aria-label="Decrease stake" onClick={() => dispatch({ type: 'BET', amount: -5 })}>−</button><label className="sr-only" htmlFor="bet">Stake amount in naira</label><span className="bet-input-wrap">₦<input id="bet" type="number" min="1" max="10000000" value={bet} onChange={event => dispatch({ type: 'SET_BET', amount: event.target.value })}/></span><button aria-label="Increase stake" onClick={() => dispatch({ type: 'BET', amount: 5 })}>+</button></div></div><button className="primary deal" onClick={() => dispatch({ type: 'PLAY' })}>{revealed ? 'Deal again' : 'Show cards'} <Sparkles size={17}/></button></div>
    </section>
    <div className="balance"><div><span>RUNNING BALANCE</span><strong>{balance === 0 ? 'All square' : balance > 0 ? `Deborah owes you ₦${balance.toLocaleString()}` : `You owe Deborah ₦${Math.abs(balance).toLocaleString()}`}</strong></div><button onClick={() => dispatch({ type: 'RESET' })}><RotateCcw size={15}/> Reset score</button></div>
    <p className="local-note">{online.status === 'connected' ? 'Both devices are synchronized live. Either player can deal or change the stake.' : 'Play locally, or start a private room to synchronize two devices — no account required.'}</p>
  </main>
}

export default function App() {
  const [page, setPage] = useState('home')
  return <AppErrorBoundary><Nav page={page} setPage={setPage}/>{page === 'home' ? <HomePage setPage={setPage}/> : page === 'games' ? <GamesPage/> : <NotesPage/>}<footer><div className="shell">Made for Deborah <span>♥</span><small>One little website. A whole lot of love.</small></div></footer></AppErrorBoundary>
}
