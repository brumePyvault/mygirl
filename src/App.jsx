import { useEffect, useState } from 'react'
import { ArrowRight, Gamepad2, Heart, Home, Mail, RotateCcw, Sparkles } from 'lucide-react'

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

function Nav({ page, setPage }) {
  return <header className="nav-wrap"><nav className="nav shell" aria-label="Main navigation">
    <button className="brand" onClick={() => setPage('home')} aria-label="Deborah, home"><span>D</span><strong>Deborah</strong></button>
    <div className="nav-links">
      <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}><Home size={16}/> Home</button>
      <button className={page === 'games' ? 'active' : ''} onClick={() => setPage('games')}><Gamepad2 size={16}/> Games</button>
    </div>
    <button className="love-note-link" onClick={() => { setPage('home'); setTimeout(() => document.querySelector('#notes')?.scrollIntoView({ behavior: 'smooth' }), 0) }}><Mail size={16}/> Love notes</button>
  </nav></header>
}

function HomePage({ setPage }) {
  const [note, setNote] = useState(() => localStorage.getItem('deborah-note') || '')
  const [saved, setSaved] = useState(false)
  const saveNote = () => { localStorage.setItem('deborah-note', note); setSaved(true); setTimeout(() => setSaved(false), 1800) }
  return <main>
    <section className="hero shell">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={15}/> A corner of the internet, just for us</div>
        <h1>Welcome, <em>Deborah.</em></h1>
        <p className="lead">I made this little place to hold our favorite memories, silly games, and all the words I never want to leave unsaid.</p>
        <div className="hero-actions"><button className="primary" onClick={() => setPage('games')}>Play a game <ArrowRight size={18}/></button><button className="secondary" onClick={() => document.querySelector('#notes').scrollIntoView({ behavior: 'smooth' })}>Leave a love note</button></div>
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
      <div className="moment-grid"><article><span>01</span><h3>Play together</h3><p>Settle the score with a quick round of Higher or Lower.</p><button onClick={() => setPage('games')}>Open games <ArrowRight size={15}/></button></article><article><span>02</span><h3>Write it down</h3><p>Leave a note for the words worth keeping close.</p><button onClick={() => document.querySelector('#notes').scrollIntoView({ behavior: 'smooth' })}>Write a note <ArrowRight size={15}/></button></article><article><span>03</span><h3>More to come</h3><p>This is only the first page of something that keeps growing.</p><div className="soon">SOON, MY LOVE</div></article></div>
    </section>
    <section className="notes-section" id="notes"><div className="shell note-layout"><div><span className="section-kicker">A NOTE FOR DEBORAH</span><h2>Some things deserve<br/>to be written down.</h2><p>Your note stays safely in this browser, ready whenever you come back.</p></div><div className="note-card"><label htmlFor="love-note">My love,</label><textarea id="love-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Today I wanted to remind you that…" maxLength={500}/><div><small>{note.length} / 500</small><button onClick={saveNote} disabled={!note.trim()}>{saved ? 'Saved with love ♥' : 'Keep this note'} <Heart size={15}/></button></div></div></div></section>
  </main>
}

function PlayingCard({ card, hidden, label }) {
  if (hidden) return <div className="playing-card card-back" aria-label={`${label} hidden card`}><div>♥</div><span>FOR<br/>US</span></div>
  return <div className={`playing-card ${card.color}`} aria-label={`${card.label} of ${card.name}`}><div className="corner"><b>{card.label}</b><i>{card.symbol}</i></div><div className="suit">{card.symbol}</div><div className="corner bottom"><b>{card.label}</b><i>{card.symbol}</i></div></div>
}

function GamesPage() {
  const [score, setScore] = useState(() => JSON.parse(localStorage.getItem('deborah-score') || '{"you":0,"deborah":0}'))
  const [bet, setBet] = useState(5)
  const [cards, setCards] = useState({ you: drawCard(), deborah: drawCard() })
  const [revealed, setRevealed] = useState(false)
  const [message, setMessage] = useState('Choose the stake, then reveal the cards.')
  useEffect(() => localStorage.setItem('deborah-score', JSON.stringify(score)), [score])
  const play = () => {
    if (revealed) { setCards({ you: drawCard(), deborah: drawCard() }); setRevealed(false); setMessage('Choose the stake, then reveal the cards.'); return }
    setRevealed(true)
    const difference = cards.you.value - cards.deborah.value
    if (!difference) return setMessage("It's a tie — nobody owes a thing!")
    const winner = difference > 0 ? 'you' : 'deborah'
    setScore(current => ({ ...current, [winner]: current[winner] + bet }))
    setMessage(difference > 0 ? `You win ₦${bet.toLocaleString()} this round!` : `Deborah wins ₦${bet.toLocaleString()} this round!`)
  }
  const reset = () => { setScore({ you: 0, deborah: 0 }); setMessage('Score cleared. Fresh start!') }
  const balance = score.you - score.deborah
  return <main className="game-page shell"><div className="game-heading"><span className="section-kicker">DATE NIGHT ARCADE</span><h1>Higher or Lower</h1><p>One draw. Highest card wins. Ace is high.</p></div>
    <section className="game-board">
      <div className="scorebar"><div><small>YOU'VE WON</small><strong>₦{score.you.toLocaleString()}</strong></div><span className="heart-chip">♥</span><div><small>DEBORAH'S WON</small><strong>₦{score.deborah.toLocaleString()}</strong></div></div>
      <div className="table"><div className="player"><span>YOU</span><PlayingCard card={cards.you} hidden={!revealed} label="Your"/></div><div className="versus">VS</div><div className="player"><span>DEBORAH</span><PlayingCard card={cards.deborah} hidden={!revealed} label="Deborah's"/></div></div>
      <div className={`result ${revealed ? 'show' : ''}`}>{message}</div>
      <div className="controls"><div className="bet"><label htmlFor="bet">Stake this round</label><div><button onClick={() => setBet(Math.max(1, bet - 5))}>−</button><span>₦{bet.toLocaleString()}</span><button onClick={() => setBet(bet + 5)}>+</button></div></div><button className="primary deal" onClick={play}>{revealed ? 'Deal again' : 'Reveal cards'} <Sparkles size={17}/></button></div>
    </section>
    <div className="balance"><div><span>RUNNING BALANCE</span><strong>{balance === 0 ? 'All square' : balance > 0 ? `Deborah owes you ₦${balance.toLocaleString()}` : `You owe Deborah ₦${Math.abs(balance).toLocaleString()}`}</strong></div><button onClick={reset}><RotateCcw size={15}/> Reset score</button></div>
    <p className="local-note">Game progress is saved on this device. Perfect for passing the phone back and forth.</p>
  </main>
}

export default function App() {
  const [page, setPage] = useState('home')
  return <><Nav page={page} setPage={setPage}/>{page === 'home' ? <HomePage setPage={setPage}/> : <GamesPage/>}<footer><div className="shell">Made for Deborah <span>♥</span><small>One little website. A whole lot of love.</small></div></footer></>
}
