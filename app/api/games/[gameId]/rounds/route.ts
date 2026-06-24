import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

const POINTS_BY_POSITION = [10, 6, 3, 1]

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const { positions, date } = await req.json()

  if (!positions || !Array.isArray(positions)) {
    return NextResponse.json({ error: 'Positions are required' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameResult = await client.query('SELECT id FROM games WHERE game_id = $1', [gameId])
    if (gameResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    const playersResult = await client.query(
      'SELECT * FROM players WHERE game_id = $1 ORDER BY position',
      [gameResult.rows[0].id]
    )
    if (positions.length !== playersResult.rows.length) {
      await client.query('ROLLBACK')
      return NextResponse.json({ error: 'Positions must match players' }, { status: 400 })
    }
    const nextRound = await client.query(
      'SELECT COALESCE(MAX(round), 0) + 1 AS next_round FROM scores WHERE game_id = $1',
      [gameResult.rows[0].id]
    )
    const round = Number(nextRound.rows[0].next_round)
    for (let i = 0; i < playersResult.rows.length; i++) {
      await client.query(
        'INSERT INTO scores (game_id, player_id, round, points, played_on) VALUES ($1, $2, $3, $4, $5)',
        [gameResult.rows[0].id, playersResult.rows[i].id, round, POINTS_BY_POSITION[Number(positions[i])], date || null]
      )
    }
    await client.query('COMMIT')
    return NextResponse.json({ round }, { status: 201 })
  } catch (err) {
    await client.query('ROLLBACK')
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  } finally {
    client.release()
  }
}
