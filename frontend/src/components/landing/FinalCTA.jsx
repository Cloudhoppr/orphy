import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function FinalCTA() {
  const nav = useNavigate()

  return (
    <section className="relative w-full py-36 px-6 overflow-hidden"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,59,92,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      <div className="max-w-3xl w-full mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase mb-6" style={{ color: '#FF3B5C' }}>
            Ready to start?
          </p>
          <h2 className="font-bold mb-6 leading-tight"
            style={{ fontSize: 'clamp(40px, 6vw, 68px)', letterSpacing: '-0.04em' }}>
            Become the singer<br />you want to be.
          </h2>
          <p className="text-lg mb-10" style={{ color: '#A1A1AA' }}>
            No setup. No subscription required for the demo.<br />
            Just sing and hear what Orphy has to say.
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

      {/* Footer */}
      <div className="mt-28 text-center">
        <p className="text-xs" style={{ color: '#505050' }}>
          © 2025 Orphy · Sing. Hear. Improve.
        </p>
      </div>
    </section>
  )
}
