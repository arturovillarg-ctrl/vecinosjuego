import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ gameId: string; round: string }> }
) {
  const { gameId, round } = await params
  try {
    await pool.query(
      `DELETE FROM scores
       WHERE round = $1
         AND game_id = (SELECT id FROM games WHERE game_id = $2)`,
      [round, gameId]
    )
    return NextResponse.json({ message: 'Round deleted' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
