import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const { players } = await req.json()

  if (!players || !Array.isArray(players) || players.length === 0) {
    return NextResponse.json({ error: 'Players are required' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const gameResult = await client.query(
      `INSERT INTO games (game_id)
       VALUES ($1)
       ON CONFLICT (game_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [gameId]
    )
    const game = gameResult.rows[0]
    await client.query('DELETE FROM players WHERE game_id = $1', [game.id])
    for (let i = 0; i < players.length; i++) {
      await client.query(
        'INSERT INTO players (game_id, name, position) VALUES ($1, $2, $3)',
        [game.id, String(players[i]).trim() || `Jugador ${i + 1}`, i + 1]
      )
    }
    await client.query('COMMIT')
    return NextResponse.json(game)
  } catch (err) {
    await client.query('ROLLBACK')
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  } finally {
    client.release()
  }
}
