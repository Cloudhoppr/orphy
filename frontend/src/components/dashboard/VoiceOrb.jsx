import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, CheckCircle } from 'lucide-react'

const BARS = 40

function WaveformRing() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const t0Ref = useRef(performance.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const size = canvas.offsetWidth
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const draw = (now) => {
      const t = (now - t0Ref.current) / 1000
      ctx.clearRect(0, 0, size, size)
      const cx = size / 2, cy = size / 2

      for (let i = 0; i < BARS; i++) {
        const angle = (i / BARS) * Math.PI * 2 - Math.PI / 2
        const p = t * 2.1 + i * 0.42
        const v = Math.abs(Math.sin(p) * 0.4 + Math.sin(p * 1.8) * 0.25 + Math.sin(p * 3.2) * 0.1)
        const barLen = 12 + v * 28
        const r = 148
        const alpha = 0.35 + v * 0.6

        const x1 = cx + Math.cos(angle) * r
        const y1 = cy + Math.sin(angle) * r
        const x2 = cx + Math.cos(angle) * (r + barLen)
        const y2 = cy + Math.sin(angle) * (r + barLen)

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = `rgba(255, 59, 92, ${alpha})`
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: -50, width: 'calc(100% + 100px)', height: 'calc(100% + 100px)', opacity: 0, animation: 'pulse-glow 0.3s ease forwards' }}
    />
  )
}

const STATE_TEXT = {
  idle:       { line1: 'Tap to Sing',         line2: 'Click to start your take' },
  listening:  { line1: 'Listening…',           line2: 'Sing your best' },
  analyzing:  { line1: 'Analyzing…',           line2: 'Processing your take' },
  responding: { line1: 'Feedback Ready',       line2: 'See analysis panel' },
}

export default function VoiceOrb({ appState, onStart, onStop, onReset }) {
  const s = STATE_TEXT[appState]

  const handleClick = () => {
    if (appState === 'idle') onStart()
    else if (appState === 'listening') onStop()
    else if (appState === 'responding') onReset()
  }

  const orbClass = `orb orb--${appState === 'idle' ? 'idle' : appState === 'listening' ? 'listening' : appState === 'analyzing' ? 'analyzing' : 'done'}`

  return (
    <div className="flex flex-col items-center gap-8">
      {/* State label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={appState}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3 }}
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: appState === 'listening' ? '#FF3B5C'
                 : appState === 'analyzing' ? '#F59E0B'
                 : appState === 'responding' ? '#22C55E'
                 : '#505050',
          }}
        >
          {appState === 'idle' ? 'Ready' : STATE_TEXT[appState].line1}
        </motion.p>
      </AnimatePresence>

      {/* Orb */}
      <motion.div
        className="relative"
        animate={{ scale: appState === 'listening' ? 1.1 : 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Waveform ring (listening only) */}
        {appState === 'listening' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            <WaveformRing />
          </div>
        )}

        {/* Expanding rings */}
        {appState === 'listening' && [0, 0.7, 1.4].map((delay, i) => (
          <div
            key={i}
            className="orb-ring"
            style={{ animation: `ring-expand 2.1s ${delay}s ease-out infinite` }}
          />
        ))}

        {/* Core orb */}
        <motion.button
          className={orbClass}
          style={{ width: 220, height: 220, zIndex: 1, position: 'relative' }}
          onClick={handleClick}
          whileHover={appState !== 'analyzing' ? { scale: 1.04 } : {}}
          whileTap={appState !== 'analyzing' ? { scale: 0.97 } : {}}
          disabled={appState === 'analyzing'}
        >
          <AnimatePresence mode="wait">
            {appState === 'analyzing' ? (
              <motion.div
                key="spinner"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#F59E0B', animation: 'spin 0.75s linear infinite' }}
              />
            ) : appState === 'responding' ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <CheckCircle size={48} color="#22C55E" />
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
              >
                <Mic
                  size={44}
                  color={appState === 'listening' ? '#FF3B5C' : 'rgba(255,255,255,0.7)'}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Sub-label — not wrapped in AnimatePresence so clicks always fire */}
      <div className="flex flex-col items-center gap-3" style={{ minHeight: 72 }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={`label-${appState}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            style={{ fontSize: 14, color: '#A1A1AA' }}
          >
            {s.line2}
          </motion.p>
        </AnimatePresence>

        {appState === 'listening' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStop() }}
            style={{
              padding: '10px 28px', borderRadius: 99,
              border: '1px solid rgba(255,59,92,0.4)',
              background: 'rgba(255,59,92,0.1)',
              color: '#FF3B5C', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              position: 'relative', zIndex: 10,
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,59,92,0.2)'
              e.currentTarget.style.borderColor = 'rgba(255,59,92,0.7)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,59,92,0.1)'
              e.currentTarget.style.borderColor = 'rgba(255,59,92,0.4)'
            }}
          >
            Stop Singing
          </button>
        )}

        {appState === 'responding' && (
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: '8px 22px', borderRadius: 99,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#A1A1AA',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Try another take
          </button>
        )}
      </div>
    </div>
  )
}
