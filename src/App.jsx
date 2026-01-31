/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

/**
 * Tic Tac Toe
 * - Human vs AI (minimax) with slight randomness among best moves.
 * - Theme switcher (Cosmic + Western).
 * - Optional Web Audio SFX (no external assets).
 */

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

const THEMES = [
  { id: 'cosmic', label: 'Cosmic' },
  { id: 'western', label: 'Western' },
  { id: 'disco', label: 'Disco' },
]

const emptyBoard = () => Array(9).fill(null)

function winnerInfo(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { symbol: board[a], line: [a, b, c] }
    }
  }
  return null
}

const isFull = (board) => board.every((cell) => cell !== null)

function minimax(board, depth, isMax, ai, human) {
  const w = winnerInfo(board)
  if (w) {
    if (w.symbol === ai) return 10 - depth
    return depth - 10
  }
  if (isFull(board)) return 0

  if (isMax) {
    let best = -Infinity
    for (let i = 0; i < board.length; i += 1) {
      if (board[i] === null) {
        board[i] = ai
        best = Math.max(best, minimax(board, depth + 1, false, ai, human))
        board[i] = null
      }
    }
    return best
  }

  let best = Infinity
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === null) {
      board[i] = human
      best = Math.min(best, minimax(board, depth + 1, true, ai, human))
      board[i] = null
    }
  }
  return best
}

function bestMove(board, ai, human) {
  let best = -Infinity
  const moves = []

  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === null) {
      board[i] = ai
      const score = minimax(board, 0, false, ai, human)
      board[i] = null

      if (score > best) {
        best = score
        moves.length = 0
        moves.push(i)
      } else if (score === best) {
        moves.push(i)
      }
    }
  }

  if (!moves.length) return null
  return moves[Math.floor(Math.random() * moves.length)]
}

function useBeep(enabled) {
  const ctxRef = useRef(null)

  const ensure = useCallback(() => {
    if (!enabled) return null
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    if (!ctxRef.current) ctxRef.current = new AudioCtx()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [enabled])

  return useCallback(
    (kind) => {
      if (!enabled) return
      const ctx = ensure()
      if (!ctx) return

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime

      // Small, pleasant blips.
      const freq =
        kind === 'human'
          ? 740
          : kind === 'ai'
            ? 480
            : kind === 'win'
              ? 900
              : kind === 'lose'
                ? 220
                : kind === 'draw'
                  ? 330
                  : 520

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.18)
    },
    [enabled, ensure],
  )
}

export default function App() {
  const [board, setBoard] = useState(emptyBoard)
  const [human, setHuman] = useState('X')
  const [turn, setTurn] = useState('X')
  const [result, setResult] = useState(null) // 'human' | 'ai' | 'draw' | null
  const [winLine, setWinLine] = useState([])
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 })
  const [soundOn, setSoundOn] = useState(true)
  const [theme, setTheme] = useState('cosmic')

  const ai = useMemo(() => (human === 'X' ? 'O' : 'X'), [human])
  const beep = useBeep(soundOn)

  // Prevent double-counting a round.
  const scoredRef = useRef(null)

  // Theme persistence.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('ttt-theme')
      if (stored && THEMES.some((t) => t.id === stored)) setTheme(stored)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('ttt-theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  const restartRound = useCallback(() => {
    setBoard(emptyBoard())
    setTurn('X')
    setResult(null)
    setWinLine([])
    scoredRef.current = null
  }, [])

  const chooseSymbol = useCallback(
    (next) => {
      if (next === human) return
      setHuman(next)
      // Clean restart when switching sides.
      setBoard(emptyBoard())
      setTurn('X')
      setResult(null)
      setWinLine([])
      scoredRef.current = null
    },
    [human],
  )

  const status = useMemo(() => {
    if (result === 'human') {
      if (theme === 'western') return 'You outdrew the outlaw. Victory.'
      if (theme === 'disco') return 'You owned the dance floor. Victory.'
      return 'You aligned the stars. Victory.'
    }
    if (result === 'ai') {
      if (theme === 'western') return 'The outlaw got the drop on you.'
      if (theme === 'disco') return 'The DJ dropped a beat you couldn’t dodge.'
      return 'Astro AI controls this sector.'
    }
    if (result === 'draw') {
      if (theme === 'western') return 'Standoff at high noon. Draw.'
      if (theme === 'disco') return 'Same groove, same score. Draw.'
      return 'Balanced universe. Draw.'
    }
    if (turn === human) return `Your move (${human}).`

    if (theme === 'western') return 'The outlaw is thinking…'
    if (theme === 'disco') return 'The DJ is cueing up a move…'
    return 'Astro AI is plotting…'
  }, [human, result, theme, turn])

  // Derive result whenever board changes.
  useEffect(() => {
    const w = winnerInfo(board)
    if (w) {
      setWinLine(w.line)
      setResult(w.symbol === human ? 'human' : 'ai')
      return
    }
    if (isFull(board)) {
      setWinLine([])
      setResult('draw')
      return
    }
    setWinLine([])
    setResult(null)
  }, [board, human])

  // Score + end-of-round tones.
  useEffect(() => {
    if (!result) return
    if (scoredRef.current === result) return

    setScore((prev) => {
      if (result === 'human') return { ...prev, wins: prev.wins + 1 }
      if (result === 'ai') return { ...prev, losses: prev.losses + 1 }
      return { ...prev, draws: prev.draws + 1 }
    })

    scoredRef.current = result

    if (result === 'human') beep('win')
    else if (result === 'ai') beep('lose')
    else beep('draw')
  }, [beep, result])

  // AI move.
  useEffect(() => {
    if (result) return
    if (turn !== ai) return

    const t = window.setTimeout(() => {
      const move = bestMove([...board], ai, human)
      if (typeof move !== 'number') return
      setBoard((prev) => {
        if (prev[move] !== null) return prev
        const next = [...prev]
        next[move] = ai
        return next
      })
      setTurn(human)
      beep('ai')
    }, 520)

    return () => window.clearTimeout(t)
  }, [ai, beep, board, human, result, turn])

  const clickCell = (idx) => {
    if (result) return
    if (turn !== human) return
    if (board[idx] !== null) return

    setBoard((prev) => {
      const next = [...prev]
      next[idx] = human
      return next
    })
    setTurn(ai)
    beep('human')
  }

  return (
    <div className={`space-app theme-${theme}`} data-theme={theme}>
      {theme === 'cosmic' ? (
        <div className="starfield" aria-hidden="true">
          <div className="stars s1" />
          <div className="stars s2" />
          <div className="stars s3" />
        </div>
      ) : theme === 'western' ? (
        <div className="western-backdrop" aria-hidden="true" />
      ) : (
        <div className="disco-backdrop" aria-hidden="true" />
      )}

      <main className="space-card">
        <header className="app-header">
          <p className="eyebrow">
            {theme === 'western'
              ? 'Frontier Saloon // Human vs Outlaw AI'
              : theme === 'disco'
                ? 'Mirrorball Arena // Human vs DJ AI'
                : 'Mission Control // Human vs Astro AI'}
          </p>
          <h1>
            {theme === 'western'
              ? 'Western Tic Tac Toe'
              : theme === 'disco'
                ? 'Disco Tic Tac Toe'
                : 'Cosmic Tic Tac Toe'}
          </h1>
          <p className="subtitle">
            {theme === 'western'
              ? 'Dusty grid. Quick hands. Best of the badlands.'
              : theme === 'disco'
                ? 'Glitter grid. Loud moves. Best-of-the-boogie.'
                : 'Neon grid. Cold logic. Best-of-the-void.'}
          </p>
        </header>

        <section className="control-grid">
          <div className="control-panel">
            <p className="panel-label">Theme</p>
            <div className="toggle" role="tablist" aria-label="Theme">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={t.id === theme ? 'active' : ''}
                  onClick={() => setTheme(t.id)}
                  role="tab"
                  aria-selected={t.id === theme}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-panel">
            <p className="panel-label">Choose your insignia</p>
            <div className="toggle" role="tablist" aria-label="Choose your symbol">
              {['X', 'O'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  className={sym === human ? 'active' : ''}
                  onClick={() => chooseSymbol(sym)}
                  role="tab"
                  aria-selected={sym === human}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          <div className="control-panel scoreboard">
            <p className="panel-label">Battle log</p>
            <div className="score-row">
              <span>Wins</span>
              <strong>{score.wins}</strong>
            </div>
            <div className="score-row">
              <span>Losses</span>
              <strong>{score.losses}</strong>
            </div>
            <div className="score-row">
              <span>Draws</span>
              <strong>{score.draws}</strong>
            </div>
          </div>

          <div className="control-panel">
            <p className="panel-label">Sound</p>
            <button
              type="button"
              className={soundOn ? '' : 'ghost'}
              onClick={() => setSoundOn((v) => !v)}
            >
              {soundOn ? 'Sound: ON' : 'Sound: OFF'}
            </button>
          </div>
        </section>

        <section className="board-section">
          <div className={`board ${result ? 'complete' : ''}`} role="grid">
            {board.map((cell, idx) => {
              const disabled = result || turn !== human || cell !== null
              const isWinning = winLine.includes(idx)
              return (
                <button
                  key={idx}
                  type="button"
                  className={`cell ${isWinning ? 'winning' : ''}`}
                  onClick={() => clickCell(idx)}
                  disabled={disabled}
                  aria-label={`Cell ${idx + 1}${cell ? `, ${cell}` : ''}`}
                >
                  <span className="glyph">{cell ?? ''}</span>
                </button>
              )
            })}
          </div>

          <div className="status-panel">
            <p className="panel-label">Status</p>
            <p className="status">{status}</p>
            <div className="actions">
              <button type="button" onClick={restartRound}>
                Restart round
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
