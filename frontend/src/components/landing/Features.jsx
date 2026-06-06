import { motion } from 'framer-motion'
import { Radio, Music, Wind, Heart, BookOpen, BarChart3 } from 'lucide-react'

const WRAP = { maxWidth: 1040, width: '100%', marginLeft: 'auto', marginRight: 'auto', padding: '0 32px' }

const FEATURES = [
  { icon: Radio,     title: 'Real-time Pitch Detection', desc: 'Centisecond-level pitch analysis with visual feedback as you sing.',    color: '#FF3B5C' },
  { icon: Music,     title: 'Rhythm Analysis',           desc: 'Onset timing and tempo consistency measured against the reference.',   color: '#A78BFA' },
  { icon: Wind,      title: 'Breath Control',            desc: 'Detect phrase breaks, breath placement, and support consistency.',     color: '#22C55E' },
  { icon: Heart,     title: 'Confidence Tracking',       desc: 'Vocal steadiness and projection measured across each phrase.',         color: '#F59E0B' },
  { icon: BookOpen,  title: 'Personalized Coaching',     desc: 'AI coaching tips tailored to your specific weak points every take.',   color: '#38BDF8' },
  { icon: BarChart3, title: 'Progress Monitoring',       desc: 'Track improvement across sessions with comparative score history.',    color: '#FB923C' },
]

export default function Features() {
  return (
    <section
      id="features"
      style={{
        width: '100%',
        padding: '112px 0',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={WRAP}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 72 }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FF3B5C', marginBottom: 14 }}>
            Capabilities
          </p>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Everything your coach notices.
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ scale: 1.025, y: -3 }}
                className="gradient-border"
                style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, transition: 'transform 0.22s ease', cursor: 'default' }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${f.color}14`, border: `1px solid ${f.color}25`,
                }}>
                  <Icon size={20} color={f.color} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 13.5, color: '#A1A1AA', lineHeight: 1.65 }}>
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
