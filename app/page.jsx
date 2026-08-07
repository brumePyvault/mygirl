'use client'

import { Component, useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { ArrowRight, Check, Copy, Dice5, Gamepad2, Heart, Home, Link2, Mail, Pencil, RotateCcw, Sparkles, Trash2, Users } from 'lucide-react'

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
const INITIAL_STAKE = 100
const newRound = score => ({ score, bet: INITIAL_STAKE, cards: { you: drawCard(), deborah: drawCard() }, revealed: false, phase: 'betting', turn: 'deborah', message: 'The opening stake is ₦100. Bluff, raise, accept, or fold.' })
const newGame = () => newRound({ you: 0, deborah: 0 })

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
    return { ...game, bet: game.phase ? game.bet : INITIAL_STAKE, phase: game.phase || (game.revealed ? 'complete' : 'betting'), turn: game.turn || 'deborah' }
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
  if (action.type === 'PLAY' && game.phase === 'complete') return newRound(game.score)
  if (game.phase !== 'betting' || action.actor !== game.turn) return game
  const otherPlayer = action.actor === 'deborah' ? 'you' : 'deborah'
  if (action.type === 'RAISE') {
    if (game.bet >= 10000000) return game
    const amount = Math.max(1, Math.min(10000000 - game.bet, Math.round(Number(action.amount) || 1)))
    const bet = game.bet + amount
    return { ...game, bet, turn: otherPlayer, message: `${action.actor === 'deborah' ? 'Deborah' : 'Brume'} adds ₦${amount.toLocaleString()}. The stake is now ₦${bet.toLocaleString()}.` }
  }
  if (action.type === 'FOLD') {
    return { ...game, phase: 'complete', score: { ...game.score, [otherPlayer]: game.score[otherPlayer] + game.bet }, message: `${action.actor === 'deborah' ? 'Deborah' : 'Brume'} folds. ${otherPlayer === 'deborah' ? 'Deborah' : 'Brume'} wins ₦${game.bet.toLocaleString()} without showing the cards.` }
  }
  if (action.type !== 'ACCEPT') return game
  const difference = game.cards.you.value - game.cards.deborah.value
  if (!difference) return { ...game, phase: 'complete', revealed: true, message: "Stake accepted. It's a tie — nobody owes a thing!" }
  const winner = difference > 0 ? 'you' : 'deborah'
  return { ...game, phase: 'complete', revealed: true, score: { ...game.score, [winner]: game.score[winner] + game.bet }, message: difference > 0 ? `Stake accepted. Brume wins ₦${game.bet.toLocaleString()}!` : `Stake accepted. Deborah wins ₦${game.bet.toLocaleString()}!` }
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

const LUDO_FINISH = 24
const newLudoGame = () => ({ turn: 'brume', dice: null, rolled: false, winner: '', tokens: { brume: [-1, -1, -1, -1], deborah: [-1, -1, -1, -1] }, message: 'Brume rolls first. Roll a six to bring a piece home.' })

function LudoGame() {
  const [ludo, setLudo] = useState(newLudoGame)
  const roll = () => setLudo(current => {
    if (current.rolled || current.winner) return current
    const dice = Math.floor(Math.random() * 6) + 1
    const canMove = current.tokens[current.turn].some(position => position >= 0 ? position + dice <= LUDO_FINISH : dice === 6)
    if (canMove) return { ...current, dice, rolled: true, message: `${current.turn === 'brume' ? 'Brume' : 'Deborah'} rolled ${dice}. Choose a piece.` }
    const turn = current.turn === 'brume' ? 'deborah' : 'brume'
    return { ...current, dice, turn, rolled: false, message: `No move this time. ${turn === 'brume' ? 'Brume' : 'Deborah'} is up.` }
  })
  const move = index => setLudo(current => {
    if (!current.rolled || current.winner) return current
    const positions = [...current.tokens[current.turn]]
    const position = positions[index]
    if ((position < 0 && current.dice !== 6) || (position >= 0 && position + current.dice > LUDO_FINISH)) return current
    const destination = position < 0 ? 0 : position + current.dice
    positions[index] = destination
    const opponent = current.turn === 'brume' ? 'deborah' : 'brume'
    const opponentPieces = [...current.tokens[opponent]]
    if (destination > 0 && destination < LUDO_FINISH) opponentPieces.forEach((spot, piece) => { if (spot === destination) opponentPieces[piece] = -1 })
    const tokens = { ...current.tokens, [current.turn]: positions, [opponent]: opponentPieces }
    const winner = positions.every(spot => spot === LUDO_FINISH) ? current.turn : ''
    const getsAnotherTurn = current.dice === 6 && !winner
    const turn = getsAnotherTurn ? current.turn : opponent
    return { ...current, tokens, winner, turn, dice: null, rolled: false, message: winner ? `${winner === 'brume' ? 'Brume' : 'Deborah'} brought every piece home and wins!` : getsAnotherTurn ? 'A six! Roll again.' : `${turn === 'brume' ? 'Brume' : 'Deborah'}’s turn.` }
  })
  const activeTokens = ludo.tokens[ludo.turn]
  return <section className="ludo-section" aria-labelledby="ludo-title">
    <div className="ludo-heading"><span className="section-kicker">NEXT ON THE BOARD</span><h2 id="ludo-title">Ludo</h2><p>Race all four pieces home. Roll a six to leave the yard — and watch out for captures.</p></div>
    <div className="ludo-game">
      <div className="ludo-board" aria-label="Ludo race board">
        <div className="ludo-yard brume-yard"><strong>BRUME</strong><div>{ludo.tokens.brume.map((position, index) => <span key={index} className={position < 0 ? '' : 'away'}>♟</span>)}</div></div>
        <div className="ludo-path">{Array.from({ length: 25 }, (_, spot) => <span key={spot} className={spot === 0 ? 'start' : spot === LUDO_FINISH ? 'finish' : ''}>{spot === LUDO_FINISH ? '♥' : <><i>{ludo.tokens.brume.filter(value => value === spot).length || ''}</i><b>{ludo.tokens.deborah.filter(value => value === spot).length || ''}</b></>}</span>)}</div>
        <div className="ludo-yard deborah-yard"><strong>DEBORAH</strong><div>{ludo.tokens.deborah.map((position, index) => <span key={index} className={position < 0 ? '' : 'away'}>♟</span>)}</div></div>
      </div>
      <div className="ludo-panel"><div className={`turn-badge ${ludo.turn}`}><span>{ludo.turn === 'brume' ? '♠' : '♥'}</span><div><small>CURRENT TURN</small><strong>{ludo.turn === 'brume' ? 'Brume' : 'Deborah'}</strong></div></div><div className="ludo-die" aria-live="polite">{ludo.dice || '—'}</div><p>{ludo.message}</p>{ludo.rolled ? <div className="piece-picker"><small>MOVE A PIECE</small><div>{activeTokens.map((position, index) => { const disabled = (position < 0 && ludo.dice !== 6) || position + ludo.dice > LUDO_FINISH; return <button key={index} disabled={disabled} onClick={() => move(index)}>♟ <span>{index + 1}</span></button> })}</div></div> : <button className="primary roll-button" disabled={Boolean(ludo.winner)} onClick={roll}><Dice5 size={19}/> Roll the dice</button>}<button className="ludo-reset" onClick={() => setLudo(newLudoGame())}><RotateCcw size={14}/> New game</button></div>
    </div>
  </section>
}

function GamesPage() {
  const [game, setGame] = useState(loadGame)
  const [raiseAmount, setRaiseAmount] = useState(100)
  const [online, setOnline] = useState({ role: 'local', status: 'offline', code: '', error: '' })
  const [player, setPlayer] = useState(() => storage.get('deborah-player') || '')
  const [savedRoom, setSavedRoom] = useState(() => {
    try {
      const room = JSON.parse(storage.get('deborah-room'))
      return room && Date.now() - room.lastActive < 5 * 60 * 1000 ? room : null
    } catch { return null }
  })
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const peerRef = useRef(null)
  const connectionRef = useRef(null)
  const gameRef = useRef(game)
  const guestView = current => ({ ...current, cards: { you: current.revealed ? current.cards.you : null, deborah: current.cards.deborah } })

  useEffect(() => { gameRef.current = game; storage.set('deborah-game', JSON.stringify(game)) }, [game])
  useEffect(() => () => peerRef.current?.destroy(), [])
  useEffect(() => {
    if (!player) return
    storage.set('deborah-player', player)
    if (online.role !== 'local') {
      const room = { role: online.role, code: online.code, player, lastActive: Date.now() }
      storage.set('deborah-room', JSON.stringify(room)); setSavedRoom(room)
    }
  }, [online.role, online.code, online.status, player])
  useEffect(() => {
    if (online.role === 'local') return
    const heartbeat = setInterval(() => {
      const room = { role: online.role, code: online.code, player, lastActive: Date.now() }
      storage.set('deborah-room', JSON.stringify(room))
    }, 15000)
    return () => clearInterval(heartbeat)
  }, [online.role, online.code, player])

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

  const hostGame = (roomCode) => {
    if (!player) return
    peerRef.current?.destroy()
    const code = roomCode || Math.random().toString(36).slice(2, 8).toUpperCase()
    const peer = new Peer(`deborah-${code.toLowerCase()}`)
    peerRef.current = peer
    setOnline({ role: 'host', status: 'waiting', code, error: '' })
    peer.on('connection', connection => attachConnection(connection, 'host'))
    peer.on('error', () => setOnline(current => ({ ...current, status: 'error', error: 'Could not create the room. Please try again.' })))
  }

  const joinGame = (roomCode) => {
    const code = (typeof roomCode === 'string' ? roomCode : joinCode).trim().replace(/[^a-z0-9]/gi, '').toUpperCase()
    if (!code || !player) return
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

  const leaveRoom = () => { peerRef.current?.destroy(); peerRef.current = null; connectionRef.current = null; storage.remove('deborah-room'); setSavedRoom(null); setOnline({ role: 'local', status: 'offline', code: '', error: '' }) }
  const returnToRoom = () => {
    if (!savedRoom) return
    setPlayer(savedRoom.player)
    if (savedRoom.role === 'host') hostGame(savedRoom.code)
    else { setJoinCode(savedRoom.code); joinGame(savedRoom.code) }
  }
  const { score, bet, cards, revealed, message, phase, turn } = game
  const actor = online.role === 'local' ? turn : player === 'deborah' ? 'deborah' : 'you'
  const canAct = phase === 'betting' && actor === turn && (online.role === 'local' || online.status === 'connected')
  const balance = score.you - score.deborah
  return <main className="game-page shell"><div className="game-heading"><span className="section-kicker">DATE NIGHT ARCADE</span><h1>Higher or Lower</h1><p>One draw. Highest card wins. Ace is high.</p></div>
    <section className="online-panel">
      <div className="online-intro"><span><Users size={18}/> PLAY ON TWO DEVICES</span><p>Choose who you are. Your room stays returnable for five minutes.</p></div>
      {online.role === 'local' ? <div className="online-setup"><div className="player-picker" aria-label="Choose player"><button className={player === 'brume' ? 'selected' : ''} onClick={() => setPlayer('brume')}>I’m Brume</button><button className={player === 'deborah' ? 'selected' : ''} onClick={() => setPlayer('deborah')}>I’m Deborah</button></div>{savedRoom && <button className="return-room" onClick={returnToRoom}>{savedRoom.player === 'brume' ? 'Brume' : 'Deborah'} is returning to {savedRoom.code}</button>}<div className="room-actions"><button className="host-button" onClick={() => hostGame()} disabled={!player}><Link2 size={16}/> Start a room</button><span>or</span><div className="join-control"><input aria-label="Room code" value={joinCode} onChange={event => setJoinCode(event.target.value.toUpperCase())} onKeyDown={event => event.key === 'Enter' && joinGame()} placeholder="ROOM CODE" maxLength={6}/><button onClick={joinGame} disabled={!player}>Join</button></div></div></div> : <div className="room-status"><div><small>{online.status === 'connected' ? `${player.toUpperCase()} — GAME IS LIVE` : online.status === 'waiting' ? `WAITING FOR ${player === 'brume' ? 'DEBORAH' : 'BRUME'}` : online.status.toUpperCase()}</small><strong>{online.code}</strong></div>{online.status === 'waiting' && <button className="copy-code" onClick={() => { navigator.clipboard.writeText(online.code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy code'}</button>}<button className="leave" onClick={leaveRoom}>Leave room</button></div>}
      {online.error && <p className="connection-error">{online.error}</p>}
    </section>
    <section className="game-board">
      <div className="scorebar"><div><small>YOU'VE WON</small><strong>₦{score.you.toLocaleString()}</strong></div><span className="heart-chip">♥</span><div><small>DEBORAH'S WON</small><strong>₦{score.deborah.toLocaleString()}</strong></div></div>
      <div className="table"><div className="player"><span>{online.role === 'guest' ? 'YOUR BABE' : 'YOU'}</span><PlayingCard card={cards.you} hidden={!revealed && online.role === 'guest'} label="Your babe's"/></div><div className="versus">VS</div><div className="player"><span>{online.role === 'guest' ? 'YOU' : 'DEBORAH'}</span><PlayingCard card={cards.deborah} hidden={!revealed && online.role !== 'guest'} label="Deborah's"/></div></div>
      <div className={`result ${phase === 'complete' ? 'show' : ''}`}>{message}</div>
      {phase === 'betting' ? <div className="wager-controls"><div className="stake-total"><small>CURRENT STAKE</small><strong>₦{bet.toLocaleString()}</strong><span>{turn === 'deborah' ? "Deborah's decision" : "Brume's decision"}</span></div><div className="raise-control"><label htmlFor="raise">Add to the stake</label><span>₦<input id="raise" type="number" min="1" max="9999900" value={raiseAmount} onChange={event => setRaiseAmount(event.target.value)}/></span></div><div className="wager-actions"><button className="fold" disabled={!canAct} onClick={() => dispatch({ type: 'FOLD', actor })}>Fold</button><button className="raise" disabled={!canAct} onClick={() => dispatch({ type: 'RAISE', actor, amount: raiseAmount })}>Match &amp; add ₦{Number(raiseAmount || 0).toLocaleString()}</button><button className="primary accept" disabled={!canAct} onClick={() => dispatch({ type: 'ACCEPT', actor })}>Accept &amp; show cards <Sparkles size={16}/></button></div></div> : <div className="controls"><button className="primary deal" onClick={() => dispatch({ type: 'PLAY' })}>Deal next round <Sparkles size={17}/></button></div>}
    </section>
    <div className="balance"><div><span>RUNNING BALANCE</span><strong>{balance === 0 ? 'All square' : balance > 0 ? `Deborah owes you ₦${balance.toLocaleString()}` : `You owe Deborah ₦${Math.abs(balance).toLocaleString()}`}</strong></div><button onClick={() => dispatch({ type: 'RESET' })}><RotateCcw size={15}/> Reset score</button></div>
    <p className="local-note">{online.status === 'connected' ? 'Both devices are synchronized live. Take turns raising, accepting, or folding.' : 'Pass the device to take turns, or start a private room to bluff on two devices.'}</p>
    <LudoGame/>
  </main>
}

export default function App() {
  const [page, setPage] = useState('home')
  return <AppErrorBoundary><Nav page={page} setPage={setPage}/>{page === 'home' ? <HomePage setPage={setPage}/> : page === 'games' ? <GamesPage/> : <NotesPage/>}<footer><div className="shell">Made for Deborah <span>♥</span><small>One little website. A whole lot of love.</small></div></footer></AppErrorBoundary>
}
