import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import type { PricePoint } from '../types'

interface Props {
  history: PricePoint[]
}

export function PriceSparkline({ history }: Props) {
  return (
    <div className="mt-2 h-12">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <Line
            type="monotone"
            dataKey="price"
            stroke="#818cf8"
            strokeWidth={2}
            dot={false}
          />
          <Tooltip
            formatter={(v) => [`€${typeof v === 'number' ? v.toFixed(2) : v}`, 'Prezzo']}
            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
