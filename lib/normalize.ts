const POINTS_BY_POSITION = [10, 6, 3, 1]

interface PlayerRow {
  id: string
  name: string
}

interface ScoreRow {
  round: number
  player_id: string
  points: number | string
  played_on: Date | string | null
  created_at: Date | string
}

export interface RoundData {
  id: string
  round: number
  date: string
  createdAt: number
  pts: number[]
  positions: number[]
}

function toDateOnly(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function toTime(value: Date | string | null | undefined): number {
  if (!value) return Date.now()
  return value instanceof Date ? value.getTime() : new Date(value as string).getTime()
}

export function normalizeRoundRows(rows: ScoreRow[], players: PlayerRow[]): RoundData[] {
  const playerIndex = new Map(players.map((p, i) => [p.id, i]))
  const grouped = new Map<number, RoundData>()

  rows.forEach((row) => {
    if (!grouped.has(row.round)) {
      grouped.set(row.round, {
        id: String(row.round),
        round: row.round,
        date: row.played_on ? toDateOnly(row.played_on) : toDateOnly(row.created_at),
        createdAt: toTime(row.created_at),
        pts: Array(players.length).fill(0),
        positions: Array(players.length).fill(null),
      })
    }
    const pi = playerIndex.get(row.player_id)
    if (pi === undefined) return
    const round = grouped.get(row.round)!
    const points = Number(row.points) || 0
    const position = POINTS_BY_POSITION.indexOf(points)
    round.pts[pi] = points
    round.positions[pi] = position === -1 ? pi : position
  })

  return Array.from(grouped.values()).map((round) => {
    const used = new Set(round.positions.filter((p) => p !== null))
    round.positions = round.positions.map((pos, i) => {
      if (pos !== null) return pos
      for (let fb = 0; fb < players.length; fb++) {
        if (!used.has(fb)) { used.add(fb); return fb }
      }
      return i
    })
    return round
  })
}
