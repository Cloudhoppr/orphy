import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  size: (i % 3) + 1.5,
  delay: (i * 0.28) % 5,
  duration: 4 + (i % 5),
}))

const WAVEFORM_BARS = Array.from({ length: 44 }, (_, i) => {
  const v = Math.abs(Math.sin(i * 0.4) * 0.6 + Math.sin(i * 0.9) * 0.3 + 0.1)
  return { height: Math.max(8, v * 64), delay: i * 0.04 }
})

export default function HeroSection() {
  const nav = useNavigate()

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        paddingTop: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background glows */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '20%', left: '15%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,59,92,0.1) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,59,92,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* Particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {PARTICLES.map(p => (
          <div key={p.id} style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            background: 'rgba(255, 59, 92, 0.5)',
            animation: `float-up ${p.duration}s ${p.delay}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Floating orb decoration */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        animation: 'hero-orb-float 6s ease-in-out infinite',
      }}>
        <div style={{
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,59,92,0.08) 0%, rgba(255,255,255,0.02) 50%, transparent 100%)',
          border: '1px solid rgba(255,255,255,0.04)',
          boxShadow: '0 0 120px rgba(255,59,92,0.08)',
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 820, width: '100%',
        margin: '0 auto', padding: '0 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 99, marginBottom: 32,
            background: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.2)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B5C', animation: 'pulse-glow 2s ease infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FF3B5C' }}>
              AI Vocal Coach
            </span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontSize: 'clamp(52px, 8vw, 88px)',
            fontWeight: 700, letterSpacing: '-0.04em',
            lineHeight: 1.0, marginBottom: 24,
          }}
        >
          Sing.{' '}
          <span style={{ color: '#FF3B5C' }}>Hear.</span>
          {' '}Improve.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          style={{ fontSize: 18, color: '#A1A1AA', lineHeight: 1.65, marginBottom: 40, maxWidth: 520 }}
        >
          Your AI vocal coach listens in real time, analyzes pitch, timing, tone,
          and confidence, then gives actionable coaching in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <button className="btn-primary" onClick={() => nav('/dashboard')}>
            Start Singing
          </button>
          <button className="btn-ghost">
            <Play size={15} />
            Watch Demo
          </button>
        </motion.div>

        {/* Waveform decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 64, height: 64 }}
        >
          {WAVEFORM_BARS.map((bar, i) => (
            <div key={i} style={{
              width: 4, height: bar.height, borderRadius: 2,
              background: `rgba(255, 59, 92, ${0.25 + (bar.height / 64) * 0.55})`,
              animation: `wave-bar ${0.8 + (i % 5) * 0.15}s ${bar.delay}s ease-in-out infinite`,
              transformOrigin: 'center',
            }} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
