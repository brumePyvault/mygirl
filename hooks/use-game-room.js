'use client'

import { useEffect, useRef, useState } from 'react'
import { storage } from '../lib/client-storage'

export function useGameRoom({ game, setGame, gameType }) {
  const gameRef = useRef(game)
  const roomKey = `deborah-room-${gameType}`
  const [player, setPlayer] = useState(() => storage.get('deborah-player') || '')
  const [online, setOnline] = useState({ role: 'local', status: 'offline', code: '', error: '' })
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedRoom, setSavedRoom] = useState(() => {
    try {
      const room = JSON.parse(storage.get(roomKey))
      return room && Date.now() - room.lastActive < 24 * 60 * 60 * 1000 ? room : null
    } catch { return null }
  })

  useEffect(() => { gameRef.current = game }, [game])
  useEffect(() => {
    if (!player) return
    storage.set('deborah-player', player)
    if (online.role !== 'local') {
      const room = { role: online.role, code: online.code, player, lastActive: Date.now() }
      storage.set(roomKey, JSON.stringify(room)); setSavedRoom(room)
    }
  }, [online.role, online.code, online.status, player, roomKey])

  useEffect(() => {
    if (online.role === 'local' || !online.code) return
    let active = true
    const sync = async () => {
      try {
        const response = await fetch(`/api/rooms?code=${encodeURIComponent(online.code)}&player=${player}&gameType=${gameType}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(response.status === 404 ? 'This room expired or no longer exists.' : 'Connection lost. Reconnecting…')
        const data = await response.json()
        if (active) { gameRef.current = data.game; setGame(data.game); setOnline(current => ({ ...current, status: current.role === 'host' && !data.ready ? 'waiting' : 'connected', error: '' })) }
      } catch (error) { if (active) setOnline(current => ({ ...current, status: 'connecting', error: error.message })) }
    }
    sync(); const timer = setInterval(sync, 1500)
    return () => { active = false; clearInterval(timer) }
  }, [online.role, online.code, player, gameType, setGame])

  const host = async () => {
    if (!player) return
    setOnline({ role: 'host', status: 'connecting', code: '', error: '' })
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')
      try {
        const response = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, game: gameRef.current, player, gameType }) })
        if (response.status === 409) continue
        if (!response.ok) throw new Error()
        setOnline({ role: 'host', status: 'waiting', code, error: '' }); return
      } catch { setOnline({ role: 'local', status: 'error', code: '', error: 'Could not create a room. Check the database connection and try again.' }); return }
    }
  }
  const join = async value => {
    const code = (typeof value === 'string' ? value : joinCode).trim().replace(/[^a-z0-9]/gi, '').toUpperCase()
    if (!code || !player) return
    setOnline({ role: 'guest', status: 'connecting', code, error: '' })
    try {
      const response = await fetch(`/api/rooms?code=${encodeURIComponent(code)}&player=${player}&gameType=${gameType}`, { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const data = await response.json(); gameRef.current = data.game; setGame(data.game)
      setOnline({ role: 'guest', status: 'connected', code, error: '' })
    } catch { setOnline({ role: 'local', status: 'error', code: '', error: 'Room not found. Check the code and try again.' }) }
  }
  const dispatch = async action => {
    if (online.role === 'local') return false
    if (online.status !== 'connected') return true
    try {
      const response = await fetch('/api/rooms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: online.code, action: { ...action, gameType } }) })
      if (!response.ok) throw new Error()
      const data = await response.json(); gameRef.current = data.game; setGame(data.game)
    } catch { setOnline(current => ({ ...current, status: 'connecting', error: 'Connection lost. Reconnecting…' })) }
    return true
  }
  const leave = () => { storage.remove(roomKey); setSavedRoom(null); setOnline({ role: 'local', status: 'offline', code: '', error: '' }) }
  const returnToRoom = () => { if (savedRoom) { setPlayer(savedRoom.player); setJoinCode(savedRoom.code); join(savedRoom.code) } }
  const copy = () => { navigator.clipboard.writeText(online.code); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return { player, setPlayer, online, joinCode, setJoinCode, copied, savedRoom, host, join, dispatch, leave, returnToRoom, copy }
}
