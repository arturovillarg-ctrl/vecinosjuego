import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { normalizeRoundRows } from '@/lib/normalize'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  try {
    const gameResult = await pool.query('SELECT * FROM games WHERE game_id = $1', [gameId])
    if (gameResult.rows.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    const playersResult = await pool.query(
      'SELECT * FROM players WHERE game_id = (SELECT id FROM games WHERE game_id = $1) ORDER BY position',
      [gameId]
    )
    const scoresResult = await pool.query(
      `SELECT s.*, p.name as player_name
       FROM scores s
       JOIN players p ON s.player_id = p.id
       WHERE s.game_id = (SELECT id FROM games WHERE game_id = $1)
       ORDER BY s.round, s.created_at`,
      [gameId]
    )
    return NextResponse.json({
      game: gameResult.rows[0],
      players: playersResult.rows,
      scores: scoresResult.rows,
      rounds: normalizeRoundRows(scoresResult.rows, playersResult.rows),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  try {
    await pool.query('DELETE FROM games WHERE game_id = $1', [gameId])
    return NextResponse.json({ message: 'Game deleted' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
