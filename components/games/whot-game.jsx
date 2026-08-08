'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Copy, Heart, Link2, RotateCcw, Sparkles, Trophy, Users } from 'lucide-react'
import { storage } from '../../lib/client-storage'
import { useGameRoom } from '../../hooks/use-game-room'

function shuffle(cards) {
  const result = cards.map(card => ({ ...card }))
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1)); [result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }
  return result
}

const whotShapes = [
  { name: 'circle', symbol: '●', color: '#cf4d58' }, { name: 'triangle', symbol: '▲', color: '#4c7392' },
  { name: 'cross', symbol: '✚', color: '#ad6d35' }, { name: 'square', symbol: '■', color: '#667b55' }, { name: 'star', symbol: '★', color: '#936785' },
]
const makeWhotDeck = () => [...whotShapes.flatMap(shape => [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14].map(number => ({ ...shape, number, id: `${shape.name}-${number}-${Math.random()}` }))), ...Array.from({ length: 5 }, (_, index) => ({ name: 'whot', symbol: 'W', number: 20, color: '#803f45', id: `whot-${index}-${Math.random()}` }))]
const canPlayWhot = (card, top, calledShape, pendingDraw = 0) => pendingDraw > 0
  ? card.number === 2
  : card.name === 'whot' || card.number === top.number || card.name === (calledShape || top.name)
const whotCardLabel = card => card.name === 'whot' ? 'WHOT 20' : `${card.number} ${card.name}`

function takeCards(deck, pile, count) {
  let deckCards = [...deck]
  let nextPile = [...pile]
  const drawn = []
  while (drawn.length < count) {
    if (!deckCards.length && nextPile.length > 1) {
      deckCards = shuffle(nextPile.slice(0, -1))
      nextPile = nextPile.slice(-1)
    }
    const card = deckCards.pop()
    if (!card) break
    drawn.push(card)
  }
  return { deck: deckCards, pile: nextPile, drawn }
}

function WhotCard({ card, hidden = false, playable = false, onClick, entering = false }) {
  if (hidden) return <div className="whot-card whot-back" aria-label="Hidden Whot card"><Heart fill="currentColor"/></div>
  return <button className={`whot-card ${playable ? 'playable' : ''} ${entering ? 'card-entering' : ''}`} style={{ '--card-color': card.color }} onClick={onClick} disabled={!onClick} aria-label={whotCardLabel(card)}><b>{card.number}</b><span>{card.symbol}</span><i>{card.name === 'whot' ? 'WHOT' : card.name}</i><b className="whot-bottom">{card.number}</b></button>
}

function createWhotGame() {
  const cards = shuffle(makeWhotDeck()); const top = cards.pop()
  return { hands: { brume: cards.splice(0, 5), deborah: cards.splice(0, 5) }, pile: [top], deck: cards, turn: 'brume', calledShape: '', pendingDraw: 0, winner: '', message: "Brume, you're up. Match the shape or number.", motion: 'deal' }
}

export default function WhotGame() {
  const [game, setGame] = useState(createWhotGame)
  const [choosing, setChoosing] = useState(null)
  const [motionCard, setMotionCard] = useState(null)
  const room = useGameRoom({ game, setGame, gameType: 'whot' })
  const top = game.pile.at(-1)
  const nextPlayer = player => player === 'brume' ? 'deborah' : 'brume'
  const finishPlay = async (player, card, shape = '') => {
    if (await room.dispatch({ type: 'WHOT_PLAY', player, cardId: card.id, shape })) { setChoosing(null); return }
    setGame(current => {
      const hand = current.hands[player].filter(item => item.id !== card.id)
      const winner = hand.length === 0 ? player : ''
      const holdsTurn = card.number === 1
      const next = holdsTurn ? player : nextPlayer(player)
      const pendingDraw = card.number === 2 ? (current.pendingDraw || 0) + 2 : 0
      let deck = current.deck
      let pile = [...current.pile, card]
      let hands = { ...current.hands, [player]: hand }
      let marketDrawn = 0
      if (card.number === 14 && !winner) {
        const market = takeCards(deck, pile, 1)
        deck = market.deck; pile = market.pile; marketDrawn = market.drawn.length
        hands = { ...hands, [next]: [...hands[next], ...market.drawn] }
      }
      const nextName = next === 'brume' ? 'Brume' : 'Deborah'
      const message = winner ? `${player === 'brume' ? 'Brume' : 'Deborah'} wins the round!` : holdsTurn ? `Hold on! ${nextName}, play again.` : pendingDraw ? `${nextName}, pick ${pendingDraw} or block with another 2.` : card.number === 14 ? `General Market! ${nextName} picked ${marketDrawn} card. ${nextName}, your turn.` : `${nextName}, your turn.`
      return { ...current, deck, hands, pile, turn: winner ? player : next, calledShape: card.name === 'whot' ? shape : '', pendingDraw, winner, message, motion: 'play' }
    })
    setMotionCard(card.id); setTimeout(() => setMotionCard(null), 500)
  }
  const play = (player, card) => {
    if (game.winner || player !== game.turn || !canPlayWhot(card, top, game.calledShape, game.pendingDraw)) return
    if (card.name === 'whot') { setChoosing({ player, card }); return }
    finishPlay(player, card)
  }
  const draw = async player => {
    if (game.winner || player !== game.turn) return
    if (await room.dispatch({ type: 'WHOT_DRAW', player })) return
    setGame(current => {
      const drawCount = current.pendingDraw || 1
      const result = takeCards(current.deck, current.pile, drawCount)
      if (!result.drawn.length) return current
      const next = nextPlayer(player)
      const drawLabel = result.drawn.length === 1 ? 'a card' : `${result.drawn.length} cards`
      return { ...current, deck: result.deck, pile: result.pile, hands: { ...current.hands, [player]: [...current.hands[player], ...result.drawn] }, turn: next, pendingDraw: 0, message: `${player === 'brume' ? 'Brume' : 'Deborah'} drew ${drawLabel}. ${next === 'brume' ? 'Brume' : 'Deborah'} is up.`, motion: 'draw' }
    })
  }
  const activePlayer = room.online.role === 'local' ? game.turn : room.player
  const canAct = room.online.role === 'local' || room.online.status === 'connected'
  return <main className="whot-page shell"><Link className="back-to-games" href="/games"><ArrowLeft size={16}/> All games</Link><div className="game-heading"><span className="section-kicker">A NIGERIAN CLASSIC</span><h1>Whot</h1><p>Match the shape or number. Play a Whot card to call the next shape.</p></div>
    <section className="online-panel">
      <div className="online-intro"><span><Users size={18}/> PLAY FROM ANYWHERE</span><p>Create a private room or join with a six-character code. Whot stays synchronized across both devices.</p></div>
      {room.online.role === 'local' ? <div className="online-setup"><div className="player-picker" aria-label="Choose player"><button className={room.player === 'brume' ? 'selected' : ''} onClick={() => room.setPlayer('brume')}>I’m Brume</button><button className={room.player === 'deborah' ? 'selected' : ''} onClick={() => room.setPlayer('deborah')}>I’m Deborah</button></div>{room.savedRoom && <button className="return-room" onClick={room.returnToRoom}>Return to {room.savedRoom.code}</button>}<div className="room-actions"><button className="host-button" onClick={room.host} disabled={!room.player}><Link2 size={16}/> Start a room</button><span>or</span><div className="join-control"><input aria-label="Room code" value={room.joinCode} onChange={event => room.setJoinCode(event.target.value.toUpperCase())} onKeyDown={event => event.key === 'Enter' && room.join()} placeholder="ROOM CODE" maxLength={6}/><button onClick={() => room.join()} disabled={!room.player}>Join</button></div></div></div> : <div className="room-status"><div><small>{room.online.status === 'connected' ? `${room.player.toUpperCase()} — GAME IS LIVE` : room.online.status === 'waiting' ? `WAITING FOR ${room.player === 'brume' ? 'DEBORAH' : 'BRUME'}` : room.online.status.toUpperCase()}</small><strong>{room.online.code}</strong></div>{room.online.status === 'waiting' && <button className="copy-code" onClick={room.copy}>{room.copied ? <Check size={15}/> : <Copy size={15}/>} {room.copied ? 'Copied' : 'Copy code'}</button>}<button className="leave" onClick={room.leave}>Leave room</button></div>}
      {room.online.error && <p className="connection-error">{room.online.error}</p>}
    </section>
    <section className={`whot-table motion-${game.motion}`}>
      <div className="whot-status"><span className={game.turn === 'deborah' ? 'active' : ''}>DEBORAH · {game.hands.deborah.length} CARDS</span><strong>{game.winner ? <><Trophy size={18}/> {game.message}</> : game.message}</strong><span className={game.turn === 'brume' ? 'active' : ''}>BRUME · {game.hands.brume.length} CARDS</span></div>
      <div className="whot-hand opponent" aria-label="Deborah's hand">{game.hands.deborah.map(card => <WhotCard key={card.id} card={card} hidden={room.online.role !== 'local' && room.player !== 'deborah'} playable={canAct && activePlayer === 'deborah' && game.turn === 'deborah' && canPlayWhot(card, top, game.calledShape, game.pendingDraw)} onClick={canAct && activePlayer === 'deborah' && game.turn === 'deborah' ? () => play('deborah', card) : undefined}/>)}</div>
      <div className="whot-center"><button className="draw-pile" onClick={() => draw(activePlayer)} disabled={!!game.winner || !canAct || activePlayer !== game.turn}><span>{game.pendingDraw || game.deck.length}</span><small>{game.pendingDraw ? `PICK ${game.pendingDraw}` : 'DRAW'}</small></button><div className="discard"><WhotCard card={top} entering={motionCard === top.id}/>{game.calledShape && <span className="called-shape">Called: {whotShapes.find(shape => shape.name === game.calledShape)?.symbol} {game.calledShape}</span>}</div></div>
      <div className="whot-hand" aria-label="Brume's hand">{game.hands.brume.map(card => <WhotCard key={card.id} card={card} hidden={room.online.role !== 'local' && room.player !== 'brume'} playable={canAct && activePlayer === 'brume' && game.turn === 'brume' && canPlayWhot(card, top, game.calledShape, game.pendingDraw)} onClick={canAct && activePlayer === 'brume' && game.turn === 'brume' ? () => play('brume', card) : undefined}/>)}</div>
      {game.winner && <button className="primary whot-again" onClick={async () => { const next = createWhotGame(); if (!(await room.dispatch({ type: 'RESET', game: next }))) setGame(next); setChoosing(null) }}><RotateCcw size={16}/> Play again</button>}
    </section>
    {choosing && <div className="modal-backdrop"><div className="shape-modal" role="dialog" aria-modal="true"><Sparkles/><h2>Call a shape</h2><p>What must the next player match?</p><div>{whotShapes.map(shape => <button key={shape.name} style={{ '--shape-color': shape.color }} onClick={() => { finishPlay(choosing.player, choosing.card, shape.name); setChoosing(null) }}><span>{shape.symbol}</span>{shape.name}</button>)}</div></div></div>}
    <aside className="whot-rules"><strong>QUICK RULES</strong><span>1 · Hold on</span><i>•</i><span>2 · Pick two / block</span><i>•</i><span>14 · General Market</span><i>•</i><span>20 · Call a shape</span></aside>
  </main>
}
