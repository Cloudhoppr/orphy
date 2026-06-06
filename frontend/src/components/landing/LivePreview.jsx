import { motion } from 'framer-motion'

const METRICS = [
  { label: 'Pitch Accuracy',    score: 78, color: '#FF3B5C' },
  { label: 'Rhythm',           score: 84, color: '#A78BFA' },
  { label: 'Breath Control',   score: 65, color: '#22C55E' },
  { label: 'Overall',          score: 76, color: '#F59E0B' },
]

const PITCH_DATA = [0.42, 0.55, 0.48, 0.72, 0.68, 0.82, 0.76, 0.61, 0.56, 0.64, 0.71, 0.79, 0.68, 0.74]

function MiniRing({ score, color, label }) {
  const r = 24
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="metric-ring"
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="37" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">
          {score}%
        </text>
      </svg>
      <span style={{ fontSize: 11, color: '#A1A1AA' }}>{label}</span>
    </div>
  )
}

export default function LivePreview() {
  const W = 280, H = 70
  const pts = PITCH_DATA.map((v, i) => `${(i / (PITCH_DATA.length - 1)) * W},${H - v * H}`)
  const linePath = `M ${pts.join(' L ')}`
  const fillPath = `${linePath} L ${W},${H} L 0,${H} Z`

  return (
    <section className="relative w-full py-24 px-6"
      style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,59,92,0.04) 0%, transparent 65%)' }} />

      <div className="max-w-5xl w-full mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#FF3B5C' }}>
            Live Dashboard
          </p>
          <h2 className="text-5xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            See your performance, clearly.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="glass-card p-1 overflow-hidden"
          style={{ boxShadow: '0 0 120px rgba(255,59,92,0.08)' }}
        >
          {/* Fake window chrome */}
          <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {['#FF5F56','#FFBD2E','#27C93F'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
            ))}
            <div className="mx-auto text-xs" style={{ color: '#A1A1AA' }}>Orphy Dashboard</div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vocal Score */}
            <div className="glass-card-sm p-5 flex flex-col items-center gap-4">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#A1A1AA' }}>Vocal Score</p>
              <div className="relative flex items-center justify-center">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="48"
                    fill="none"
                    stroke="#FF3B5C"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - 0.76)}`}
                    strokeLinecap="round"
                    className="metric-ring"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold" style={{ letterSpacing: '-0.03em' }}>76</span>
                  <span className="text-xs" style={{ color: '#A1A1AA' }}>/ 100</span>
                </div>
              </div>
              <div className="w-full flex gap-2">
                <div className="flex-1 text-center py-2 rounded-xl text-xs" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                  +12 pts
                </div>
                <div className="flex-1 text-center py-2 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.04)', color: '#A1A1AA' }}>
                  Good
                </div>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="glass-card-sm p-5 flex flex-col gap-5">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#A1A1AA' }}>Breakdown</p>
              <div className="grid grid-cols-2 gap-4">
                {METRICS.map(m => <MiniRing key={m.label} {...m} />)}
              </div>
            </div>

            {/* Pitch graph */}
            <div className="glass-card-sm p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#A1A1AA' }}>Pitch Contour</p>
              <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="pg" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,59,92,0.35)" />
                    <stop offset="100%" stopColor="rgba(255,59,92,0)" />
                  </linearGradient>
                </defs>
                <path d={fillPath} fill="url(#pg)" />
                <path d={linePath} fill="none" stroke="#FF3B5C" strokeWidth="2" strokeLinecap="round" className="pitch-line" />
              </svg>
              <div className="flex gap-2 mt-2">
                {['Flat sections','Timing drift','Breath break'].map(t => (
                  <div key={t} className="flex-1 py-1.5 rounded-lg text-center"
                    style={{ background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.12)', fontSize: 10, color: '#A1A1AA' }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
