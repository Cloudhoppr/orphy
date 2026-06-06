import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'

// Deterministic particle positions
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
    <section className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{ minHeight: '100vh', paddingTop: 64 }}>

      {/* Background radial glows */}
      <div className="absolute inset-0 pointer-events-none">
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: 'rgba(255, 59, 92, 0.5)',
              animation: `float-up ${p.duration}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Floating glassmorphic orb */}
      <div className="absolute pointer-events-none" style={{
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'hero-orb-float 6s ease-in-out infinite',
      }}>
        <div style={{
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,59,92,0.08) 0%, rgba(255,255,255,0.02) 50%, transparent 100%)',
          backdropFilter: 'blur(1px)',
          border: '1px solid rgba(255,255,255,0.04)',
          boxShadow: '0 0 120px rgba(255,59,92,0.08)',
        }} />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6" style={{ maxWidth: 820 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{
              background: 'rgba(255,59,92,0.08)',
              border: '1px solid rgba(255,59,92,0.2)',
            }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B5C', animation: 'pulse-glow 2s ease infinite' }} />
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#FF3B5C' }}>
              AI Vocal Coach
            </span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-bold tracking-tight leading-none mb-6"
          style={{ fontSize: 'clamp(52px, 8vw, 88px)', letterSpacing: '-0.04em' }}
        >
          Sing.{' '}
          <span style={{ color: '#FF3B5C' }}>Hear.</span>
          {' '}Improve.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg leading-relaxed mb-10"
          style={{ color: '#A1A1AA', maxWidth: 560, fontSize: 18 }}
        >
          Your AI vocal coach listens in real time, analyzes pitch, timing, tone,
          and confidence, then gives actionable coaching in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center gap-4 flex-wrap justify-center"
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
          className="flex items-center gap-0.5 mt-16"
          style={{ height: 64 }}
        >
          {WAVEFORM_BARS.map((bar, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: bar.height,
                borderRadius: 2,
                background: `rgba(255, 59, 92, ${0.25 + (bar.height / 64) * 0.55})`,
                animation: `wave-bar ${0.8 + (i % 5) * 0.15}s ${bar.delay}s ease-in-out infinite`,
                transformOrigin: 'center',
              }}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
