import mongoose from 'mongoose'
import { NextResponse } from 'next/server'

const roomSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  game: { type: mongoose.Schema.Types.Mixed, required: true },
  players: [{ type: String, enum: ['brume', 'deborah'] }],
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true })

const Room = mongoose.models.GameRoom || mongoose.model('GameRoom', roomSchema)
const ROOM_LIFETIME = 24 * 60 * 60 * 1000

async function connect() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured')
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.MONGODB_URI)
}

function updateGame(game, action) {
  if (!game || !action) return game
  if (action.type === 'RESET') return action.game
  if (action.type === 'PLAY' && game.phase === 'complete') return action.game
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

const response = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(request) {
  try {
    await connect()
    const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase()
    const player = request.nextUrl.searchParams.get('player')?.toLowerCase()
    const room = code && await Room.findOne({ code, expiresAt: { $gt: new Date() } })
    if (!room) return response({ error: 'Room not found or expired.' }, 404)
    if (['brume', 'deborah'].includes(player) && !room.players.includes(player)) {
      room.players.push(player)
      await room.save()
    }
    return response({ game: room.game, code: room.code, expiresAt: room.expiresAt, ready: room.players.length > 1 })
  } catch {
    return response({ error: 'Could not reach the room service.' }, 503)
  }
}

export async function POST(request) {
  try {
    await connect()
    const { code, game, player } = await request.json()
    if (!/^[A-Z0-9]{6}$/.test(code || '') || !game?.score || !game?.cards) return response({ error: 'Invalid room.' }, 400)
    const room = await Room.create({ code, game, players: [player], expiresAt: new Date(Date.now() + ROOM_LIFETIME) })
    return response({ game: room.game, code: room.code, expiresAt: room.expiresAt }, 201)
  } catch (error) {
    if (error?.code === 11000) return response({ error: 'That room code is already in use.' }, 409)
    return response({ error: 'Could not create the room.' }, 503)
  }
}

export async function PATCH(request) {
  try {
    await connect()
    const { code, action } = await request.json()
    const room = await Room.findOne({ code: String(code || '').toUpperCase(), expiresAt: { $gt: new Date() } })
    if (!room) return response({ error: 'Room not found or expired.' }, 404)
    room.game = updateGame(room.game, action)
    room.markModified('game')
    await room.save()
    return response({ game: room.game })
  } catch {
    return response({ error: 'Could not update the room.' }, 503)
  }
}
