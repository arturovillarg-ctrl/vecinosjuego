'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const PLAYER_COLORS = ['#f0c040', '#b0bcd0', '#c8784a', '#7878c8']

interface Round {
  date: string
  round: number
  pts: number[]
  positions: number[]
}

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function GameChart({
  rounds,
  players,
  chartTab,
}: {
  rounds: Round[]
  players: string[]
  chartTab: 'acumulado' | 'posicion'
}) {
  const sorted = [...rounds].sort((a, b) => a.date.localeCompare(b.date) || a.round - b.round)
  const labels = sorted.map((r) => fmtDate(r.date))

  const datasets = players.map((name, i) => {
    let acc = 0
    const data =
      chartTab === 'acumulado'
        ? sorted.map((r) => { acc += Number(r.pts[i]) || 0; return acc })
        : sorted.map((r) => Number(r.positions[i]) + 1)
    return {
      label: name,
      data,
      borderColor: PLAYER_COLORS[i],
      backgroundColor: `${PLAYER_COLORS[i]}33`,
      tension: 0.3,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: false,
    }
  })

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#b0b0d0', font: { family: 'DM Sans', size: 12 } } },
      tooltip: {
        backgroundColor: '#1c1c26',
        titleColor: '#eeeef5',
        bodyColor: '#b0b0d0',
        borderColor: '#2a2a38',
        borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: '#7070a0', font: { size: 11 } }, grid: { color: '#1e1e2e' } },
      y:
        chartTab === 'posicion'
          ? {
              reverse: true,
              min: 1,
              max: 4,
              ticks: { stepSize: 1, color: '#7070a0', callback: (v: number | string) => `${v}°` },
              grid: { color: '#1e1e2e' },
            }
          : { ticks: { color: '#7070a0' }, grid: { color: '#1e1e2e' } },
    },
  }

  return (
    <div style={{ height: '280px', position: 'relative' }}>
      <Line data={{ labels, datasets }} options={options as Parameters<typeof Line>[0]['options']} />
    </div>
  )
}
