import Link from 'next/link'
import { ArrowRight, Layers3, Sparkles } from 'lucide-react'

export default function GamesGallery() {
  return <main className="games-gallery shell"><div className="gallery-heading"><span className="section-kicker">JUST THE TWO OF US</span><h1>Pick a game.</h1><p>A tiny date-night arcade for quiet evenings, loud laughs, and playful rivalries.</p></div><section className="game-grid">
    <article className="game-tile higher-tile"><div className="tile-art"><div className="floating-card card-one">A<span>♥</span></div><div className="floating-card card-two">K<span>♠</span></div><Sparkles/></div><div className="tile-copy"><span className="game-tag">CARDS · BLUFFING</span><h2>Higher or Lower</h2><p>Raise the stakes, call the bluff, and see whose card comes out on top.</p><Link className="primary" href="/games/higher-or-lower">Play now <ArrowRight size={17}/></Link></div></article>
    <article className="game-tile whot-tile"><div className="tile-art"><div className="whot-preview"><b>20</b><span>W</span><i>WHOT</i></div><div className="shape-rain"><span>●</span><span>▲</span><span>★</span><span>■</span></div></div><div className="tile-copy"><span className="game-tag">CLASSIC · STRATEGY</span><h2>Whot</h2><p>Match shapes and numbers, call your suit, and race to empty your hand.</p><Link className="primary" href="/games/whot">Play now <ArrowRight size={17}/></Link></div></article>
  </section><div className="gallery-note"><Layers3 size={18}/><span><strong>Made for passing the phone.</strong> Take turns, keep your hand close, and play fair-ish.</span></div></main>
}
