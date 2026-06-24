'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'

const GameChart = dynamic(() => import('./components/GameChart'), { ssr: false })

interface Round {
  id: string
  round: number
  date: string
  pts: number[]
  positions: number[]
}

type Tab = 'clasificacion' | 'registrar' | 'historial' | 'grafica'
type ChartTab = 'acumulado' | 'posicion'

const POS_LABELS = ['🥇 1°', '🥈 2°', '🥉 3°', '4°']
const POS_CHIPS = ['p1', 'p2', 'p3', 'p4'] as const
const MEDALS = ['🥇', '🥈', '🥉', '']
const RANK_CLASSES = ['rank-1', 'rank-2', 'rank-3', 'rank-4']
const TABS: Tab[] = ['clasificacion', 'registrar', 'historial', 'grafica']
const TAB_ICONS: Record<Tab, string> = { clasificacion: '🏆', registrar: '🃏', historial: '📋', grafica: '📊' }
const TAB_LABELS: Record<Tab, string> = { clasificacion: 'CLASIFICACIÓN', registrar: 'REGISTRAR', historial: 'HISTORIAL', grafica: 'EVOLUCIÓN' }
const GAME_ID = 'vecinos'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error de API')
  return data
}

function AceCard() {
  return (
    <div className="logo-wrap">
      <div className="ace-card">
        <div className="ace-corner tl">A<br />♥</div>
        <div className="ace-heart">♥</div>
        <div className="ace-corner br">A<br />♥</div>
      </div>
    </div>
  )
}

export default function VecinosApp() {
  const [players, setPlayers] = useState<string[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('clasificacion')
  const [chartTab, setChartTab] = useState<ChartTab>('acumulado')
  const [setupNames, setSetupNames] = useState(['', '', '', ''])
  const [setupError, setSetupError] = useState('')
  const [roundError, setRoundError] = useState('')
  const [roundDate, setRoundDate] = useState(todayISO)
  const [positions, setPositions] = useState(['', '', '', ''])
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadGame = useCallback(async () => {
    try {
      const detail = await apiFetch(`/api/games/${GAME_ID}`)
      setPlayers(detail.players.map((p: { name: string }) => p.name))
      setRounds(detail.rounds || [])
      setGameStarted(true)
    } catch (err) {
      if (!String((err as Error).message).includes('not found')) {
        setSetupError(`Error: ${(err as Error).message}`)
      }
      setGameStarted(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGame()
    try {
      const saved = localStorage.getItem('marcador_players')
      if (saved) setSetupNames(JSON.parse(saved))
    } catch {
      localStorage.removeItem('marcador_players')
    }
  }, [loadGame])

  const handleStart = async () => {
    const names = setupNames.map((n, i) => n.trim() || `Jugador ${i + 1}`)
    try {
      await apiFetch(`/api/games/${GAME_ID}/players`, {
        method: 'PUT',
        body: JSON.stringify({ players: names }),
      })
      setPlayers(names)
      setRounds([])
      setPositions(['', '', '', ''])
      setRoundDate(todayISO())
      setGameStarted(true)
      setSetupError('')
      localStorage.setItem('marcador_players', JSON.stringify(names))
    } catch (err) {
      setSetupError(`Error: ${(err as Error).message}`)
    }
  }

  const handleAddRound = async () => {
    const posNums = positions.map((p) => (p === '' ? null : parseInt(p, 10)))
    if (posNums.some((p) => p === null)) {
      setRoundError('Asigna una posición a cada jugador.')
      return
    }
    const sorted = [...(posNums as number[])].sort((a, b) => a - b)
    if (JSON.stringify(sorted) !== '[0,1,2,3]') {
      setRoundError('Cada posición debe usarse exactamente una vez.')
      return
    }
    if (!roundDate) { setRoundError('Selecciona una fecha.'); return }
    try {
      setRoundError('')
      await apiFetch(`/api/games/${GAME_ID}/rounds`, {
        method: 'POST',
        body: JSON.stringify({ positions: posNums, date: roundDate }),
      })
      await loadGame()
      setPositions(['', '', '', ''])
      setActiveTab('clasificacion')
    } catch (err) {
      setRoundError(`Error: ${(err as Error).message}`)
    }
  }

  const handleDelRound = async (id: string) => {
    if (!confirm('¿Eliminar esta partida?')) return
    try {
      await apiFetch(`/api/games/${GAME_ID}/rounds/${encodeURIComponent(id)}`, { method: 'DELETE' })
      await loadGame()
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    }
  }

  const totalScores = players.map((_, i) =>
    rounds.reduce((sum, r) => sum + (Number(r.pts[i]) || 0), 0)
  )
  const leaderboard = players
    .map((name, i) => ({ name, score: totalScores[i] }))
    .sort((a, b) => b.score - a.score)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Cargando...</p>
      </div>
    )
  }

  if (!gameStarted) {
    return (
      <>
        <header className="header">
          <AceCard />
          <h1>VECINOS</h1>
        </header>
        <div id="setup">
          <div className="card">
            <div className="card-title">Jugadores</div>
            <div className="player-grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="player-field">
                  <span className="player-num">{i + 1}</span>
                  <input
                    type="text"
                    placeholder={`Jugador ${i + 1}`}
                    maxLength={14}
                    value={setupNames[i]}
                    onChange={(e) => {
                      const next = [...setupNames]
                      next[i] = e.target.value
                      setSetupNames(next)
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="card-title">Puntuación</div>
            <div className="score-pills">
              <span className="pill pill-1">🥇 1° = 10 pts</span>
              <span className="pill pill-2">🥈 2° = 6 pts</span>
              <span className="pill pill-3">🥉 3° = 3 pts</span>
              <span className="pill pill-4">4° = 1 pt</span>
            </div>
            <button className="btn-primary" onClick={handleStart}>COMENZAR</button>
            {setupError && <p className="error-msg">{setupError}</p>}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="header">
        <AceCard />
        <h1>VECINOS</h1>
      </header>

      <nav className="nav-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`nav-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="tab-icon">{TAB_ICONS[tab]}</span>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      <div className="content">
        {activeTab === 'clasificacion' && (
          <div className="card">
            <div className="card-title">🏆 Clasificación</div>
            <div className="card-subtitle">1° → 10 pts · 2° → 6 pts · 3° → 3 pts · 4° → 1 pt</div>
            {leaderboard.map((player, rank) => (
              <div key={player.name} className={`lb-row ${RANK_CLASSES[rank]}`}>
                <div className="lb-medal">{MEDALS[rank] || `${rank + 1}°`}</div>
                <div className="lb-name">{player.name}</div>
                <div className="lb-score-wrap">
                  <span className="lb-score">{player.score}</span>
                  <span className="lb-pts-label">pts</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'registrar' && (
          <div className="card">
            <div className="card-title">🃏 Registrar Partida</div>
            <div className="date-wrap">
              <label>📅 Fecha</label>
              <input type="date" value={roundDate} onChange={(e) => setRoundDate(e.target.value)} />
            </div>
            <div className="round-grid">
              {players.map((player, i) => (
                <div key={i} className="pos-select-wrap">
                  <label>{player}</label>
                  <select
                    value={positions[i]}
                    onChange={(e) => {
                      const next = [...positions]
                      next[i] = e.target.value
                      setPositions(next)
                    }}
                  >
                    <option value="">— posición —</option>
                    {POS_LABELS.map((label, pos) => (
                      <option key={pos} value={pos}>{label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button className="btn-add" onClick={handleAddRound}>+ GUARDAR PARTIDA</button>
            {roundError && <p className="error-msg">{roundError}</p>}
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="card">
            <div className="card-title">📋 Historial por Fecha</div>
            {rounds.length === 0 ? (
              <p className="empty-msg">Aún no hay partidas registradas.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      {players.map((p) => <th key={p}>{p}</th>)}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rounds]
                      .sort((a, b) => a.date.localeCompare(b.date) || a.round - b.round)
                      .map((round) => (
                        <tr key={round.id}>
                          <td className="td-date">{fmtDate(round.date)}</td>
                          {round.positions.map((pos, i) => (
                            <td key={i}>
                              <span className={`pos-chip ${POS_CHIPS[pos]}`}>{POS_LABELS[pos]}</span>
                              <span className="td-pts">+{round.pts[i]}</span>
                            </td>
                          ))}
                          <td>
                            <button className="btn-del" onClick={() => handleDelRound(round.id)}>✕</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'grafica' && (
          <div className="card">
            <div className="card-title">📊 Evolución</div>
            <div className="chart-tabs">
              <button
                className={`chart-tab${chartTab === 'acumulado' ? ' active' : ''}`}
                onClick={() => setChartTab('acumulado')}
              >
                Puntaje acumulado
              </button>
              <button
                className={`chart-tab${chartTab === 'posicion' ? ' active' : ''}`}
                onClick={() => setChartTab('posicion')}
              >
                Posición por partida
              </button>
            </div>
            {rounds.length === 0 ? (
              <p className="empty-msg">Aún no hay partidas para graficar.</p>
            ) : (
              <GameChart rounds={rounds} players={players} chartTab={chartTab} />
            )}
          </div>
        )}
      </div>
    </>
  )
}
