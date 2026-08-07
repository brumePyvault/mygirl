'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Link2, RotateCcw, Sparkles, Users } from 'lucide-react'
import { storage } from '../../lib/client-storage'

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

function PlayingCard({ card, hidden, label }) {
  if (hidden) return <div className="playing-card card-back" aria-label={`${label} hidden card`}><div>♥</div><span>FOR<br/>US</span></div>
  return <div className={`playing-card ${card.color}`} aria-label={`${card.label} of ${card.name}`}><div className="corner"><b>{card.label}</b><i>{card.symbol}</i></div><div className="suit">{card.symbol}</div><div className="corner bottom"><b>{card.label}</b><i>{card.symbol}</i></div></div>
}

export default function HigherLowerGame() {
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
  return <main className="game-page shell"><Link className="back-to-games" href="/games"><ArrowLeft size={16}/> All games</Link><div className="game-heading"><span className="section-kicker">DATE NIGHT ARCADE</span><h1>Higher or Lower</h1><p>One draw from a 52-card deck. Highest card wins. Ace is high.</p></div>
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
