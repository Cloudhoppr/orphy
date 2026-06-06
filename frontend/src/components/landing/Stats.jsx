import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'

function Counter({ target, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const v = useMotionValue(0)
  const display = useTransform(v, n => Math.round(n).toLocaleString())

  useEffect(() => {
    if (inView) animate(v, target, { duration: 2, ease: 'easeOut' })
  }, [inView, target, v])

  return (
    <span ref={ref}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

const STATS = [
  { target: 10000, suffix: '+', label: 'Practice Sessions',                   sub: 'and counting' },
  { target: 92,    suffix: '%', label: 'Average Pitch Accuracy Improvement',  sub: 'across all users' },
  { target: 4.9,   suffix: '/5', label: 'User Rating',                        sub: 'from vocal students', isDecimal: true },
  { target: 3,     suffix: 's',  label: 'Average Feedback Time',              sub: 'from stop to coaching' },
]

export default function Stats() {
  return (
    <section className="relative w-full py-28 px-6"
      style={{
        background: 'rgba(255,255,255,0.015)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(255,59,92,0.04) 0%, transparent 60%)' }} />

      <div className="relative max-w-5xl w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            The numbers speak.
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card p-7 flex flex-col gap-2"
            >
              <div className="text-4xl font-bold" style={{ letterSpacing: '-0.04em', color: '#fff' }}>
                {s.isDecimal
                  ? '4.9/5'
                  : <Counter target={s.target} suffix={s.suffix} />
                }
              </div>
              <p className="text-sm font-medium leading-snug">{s.label}</p>
              <p className="text-xs" style={{ color: '#A1A1AA' }}>{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
