import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Lightbulb } from 'lucide-react'

const DEFAULT_METRICS = {
  pitch:      { score: 0, label: 'Pitch Accuracy' },
  rhythm:     { score: 0, label: 'Rhythm' },
  breath:     { score: 0, label: 'Breath Control' },
  confidence: { score: 0, label: 'Confidence' },
  overall:    0,
}

const PITCH_DATA = [0.42, 0.55, 0.48, 0.72, 0.68, 0.82, 0.76, 0.61, 0.56, 0.64, 0.71, 0.79]

function MetricRow({ label, score, color, animated }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: 12.5, color: '#A1A1AA' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{score}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            background: color,
            borderRadius: 99,
            width: animated ? `${score}%` : '0%',
            transition: 'width 1.4s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
    </div>
  )
}

function PitchGraph() {
  const W = 240, H = 56
  const pts = PITCH_DATA.map((v, i) => `${(i / (PITCH_DATA.length - 1)) * W},${H - v * H}`)
  const line = `M ${pts.join(' L ')}`
  const fill = `${line} L ${W},${H} L 0,${H} Z`

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="pg2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,59,92,0.3)" />
          <stop offset="100%" stopColor="rgba(255,59,92,0)" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#pg2)" />
      <path d={line} fill="none" stroke="#FF3B5C" strokeWidth="1.5" strokeLinecap="round" className="pitch-line" />
    </svg>
  )
}

export default function AnalysisPanel({ feedback, appState }) {
  const m = feedback?.metrics ?? DEFAULT_METRICS
  const hasData = !!feedback

  const ROWS = [
    { key: 'pitch',      color: '#FF3B5C' },
    { key: 'rhythm',     color: '#A78BFA' },
    { key: 'breath',     color: '#22C55E' },
    { key: 'confidence', color: '#F59E0B' },
  ]

  return (
    <div className="flex flex-col h-full" style={{ padding: '20px 16px', gap: 14 }}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Activity size={15} color="#FF3B5C" />
        <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A1A1AA' }}>
          Vocal Analysis
        </span>
      </div>

      {/* Overall score */}
      <div className="glass-card-sm p-5 flex flex-col items-center gap-3">
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA' }}>
          Overall Score
        </p>
        <div className="relative flex items-center justify-center">
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx="52" cy="52" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
            <circle
              cx="52" cy="52" r="42"
              fill="none"
              stroke="#FF3B5C"
              strokeWidth="7"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - m.overall / 100)}`}
              strokeLinecap="round"
              className="metric-ring"
              transform="rotate(-90 52 52)"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em' }}>
              {m.overall}
            </span>
            <span style={{ fontSize: 11, color: '#A1A1AA' }}>/100</span>
          </div>
        </div>
        {hasData && (
          <div style={{
            fontSize: 12, fontWeight: 500,
            color: m.overall >= 80 ? '#22C55E' : m.overall >= 60 ? '#F59E0B' : '#FF3B5C',
          }}>
            {m.overall >= 80 ? 'Excellent' : m.overall >= 60 ? 'Good' : 'Needs Work'}
          </div>
        )}
      </div>

      {/* Metric rows */}
      <div className="glass-card-sm p-4 flex flex-col gap-3.5">
        {ROWS.map(r => (
          <MetricRow
            key={r.key}
            label={m[r.key].label}
            score={m[r.key].score}
            color={r.color}
            animated={hasData}
          />
        ))}
      </div>

      {/* Pitch graph */}
      <div className="glass-card-sm p-4 flex flex-col gap-3">
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A1A1AA' }}>
          Pitch Contour
        </p>
        <PitchGraph />
      </div>

      {/* AI tips */}
      <AnimatePresence>
        {feedback?.fixes && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card-sm p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <Lightbulb size={13} color="#F59E0B" />
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A1A1AA' }}>
                AI Coaching Tips
              </p>
            </div>
            {feedback.fixes.map((fix, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#FF3B5C',
                }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 12.5, color: '#A1A1AA', lineHeight: 1.65 }}>{fix}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!hasData && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-30">
          <Activity size={32} color="#A1A1AA" />
          <p style={{ fontSize: 13, color: '#A1A1AA', textAlign: 'center', lineHeight: 1.6 }}>
            Sing a take to see<br />your vocal analysis
          </p>
        </div>
      )}
    </div>
  )
}
