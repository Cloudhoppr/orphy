import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'

const WRAP = { maxWidth: 1040, width: '100%', marginLeft: 'auto', marginRight: 'auto', padding: '0 32px', position: 'relative', zIndex: 1 }

function Counter({ target, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const v = useMotionValue(0)
  const display = useTransform(v, n => Math.round(n).toLocaleString())

  useEffect(() => {
    if (inView) animate(v, target, { duration: 2, ease: 'easeOut' })
  }, [inView, target, v])

  return (
    <span ref={ref}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

const STATS = [
  { target: 10000, suffix: '+', label: 'Practice Sessions',                  sub: 'and counting' },
  { target: 92,    suffix: '%', label: 'Pitch Accuracy Improvement',         sub: 'across all users' },
  { target: 4,     suffix: '.9/5', label: 'User Rating',                     sub: 'from vocal students' },
  { target: 3,     suffix: 's',  label: 'Average Feedback Time',             sub: 'from stop to coaching' },
]

export default function Stats() {
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
      {/* Ambient glow — contained inside the section */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(255,59,92,0.05) 0%, transparent 60%)',
      }} />

      <div style={WRAP}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 56 }}
        >
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            The numbers speak.
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card"
              style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', color: '#fff' }}>
                <Counter target={s.target} suffix={s.suffix} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{s.label}</p>
              <p style={{ fontSize: 12, color: '#A1A1AA' }}>{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
