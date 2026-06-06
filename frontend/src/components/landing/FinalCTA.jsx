import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const WRAP = { maxWidth: 720, width: '100%', marginLeft: 'auto', marginRight: 'auto', padding: '0 32px', position: 'relative', zIndex: 1, textAlign: 'center' }

export default function FinalCTA() {
  const nav = useNavigate()

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        padding: '128px 0 80px',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,59,92,0.1) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={WRAP}>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FF3B5C', marginBottom: 20 }}>
            Ready to start?
          </p>
          <h2 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 20 }}>
            Become the singer<br />you want to be.
          </h2>
          <p style={{ fontSize: 18, color: '#A1A1AA', marginBottom: 40, lineHeight: 1.6 }}>
            No setup required. Just sing and hear what Orphy has to say.
          </p>

          <motion.button
            className="btn-primary"
            style={{ fontSize: 17, padding: '16px 40px' }}
            onClick={() => nav('/dashboard')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
          >
            Launch Orphy
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </div>

      <div style={{ marginTop: 96, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#404040' }}>© 2025 Orphy · Sing. Hear. Improve.</p>
      </div>
    </section>
  )
}
