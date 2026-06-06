import { motion } from 'framer-motion'

const WRAP = { maxWidth: 1040, width: '100%', marginLeft: 'auto', marginRight: 'auto', padding: '0 32px', position: 'relative', zIndex: 1 }

const METRICS = [
  { label: 'Pitch Accuracy', score: 78, color: '#FF3B5C' },
  { label: 'Rhythm',         score: 84, color: '#A78BFA' },
  { label: 'Breath Control', score: 65, color: '#22C55E' },
  { label: 'Overall',        score: 76, color: '#F59E0B' },
]

const PITCH_DATA = [0.42, 0.55, 0.48, 0.72, 0.68, 0.82, 0.76, 0.61, 0.56, 0.64, 0.71, 0.79, 0.68, 0.74]

function MiniRing({ score, color, label }) {
  const r = 24, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="metric-ring" transform="rotate(-90 32 32)" />
        <text x="32" y="37" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">{score}%</text>
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
    <section
      style={{
        position: 'relative',
        width: '100%',
        padding: '96px 0',
        background: 'rgba(255,255,255,0.015)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(255,59,92,0.04) 0%, transparent 65%)',
      }} />

      <div style={WRAP}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FF3B5C', marginBottom: 14 }}>
            Live Dashboard
          </p>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            See your performance, clearly.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="glass-card"
          style={{ padding: 4, overflow: 'hidden', boxShadow: '0 0 120px rgba(255,59,92,0.08)' }}
        >
          {/* Window chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['#FF5F56','#FFBD2E','#27C93F'].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
            ))}
            <div style={{ margin: '0 auto', fontSize: 12, color: '#A1A1AA' }}>Orphy Dashboard</div>
          </div>

          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {/* Vocal Score */}
            <div className="glass-card-sm" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA' }}>Vocal Score</p>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="48" fill="none" stroke="#FF3B5C" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * 0.24}`}
                    strokeLinecap="round" className="metric-ring" transform="rotate(-90 60 60)" />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>76</span>
                  <span style={{ fontSize: 11, color: '#A1A1AA' }}>/100</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 12, fontSize: 11, background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>+12 pts</div>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 12, fontSize: 11, background: 'rgba(255,255,255,0.04)', color: '#A1A1AA' }}>Good</div>
              </div>
            </div>

            {/* Metrics */}
            <div className="glass-card-sm" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA' }}>Breakdown</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {METRICS.map(m => <MiniRing key={m.label} {...m} />)}
              </div>
            </div>

            {/* Pitch graph */}
            <div className="glass-card-sm" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA' }}>Pitch Contour</p>
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
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {['Flat sections','Timing drift','Breath break'].map(t => (
                  <div key={t} style={{ flex: 1, padding: '6px 0', borderRadius: 8, textAlign: 'center', fontSize: 10, color: '#A1A1AA', background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.12)' }}>
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
