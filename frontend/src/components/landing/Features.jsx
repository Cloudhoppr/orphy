import { motion } from 'framer-motion'
import { Radio, Music, Wind, Heart, BookOpen, BarChart3 } from 'lucide-react'

const FEATURES = [
  { icon: Radio,      title: 'Real-time Pitch Detection', desc: 'Centisecond-level pitch analysis with visual feedback as you sing.',     color: '#FF3B5C' },
  { icon: Music,      title: 'Rhythm Analysis',           desc: 'Onset timing and tempo consistency measured against the reference.',   color: '#A78BFA' },
  { icon: Wind,       title: 'Breath Control',            desc: 'Detect phrase breaks, breath placement, and support consistency.',     color: '#22C55E' },
  { icon: Heart,      title: 'Confidence Tracking',       desc: 'Vocal steadiness and projection measured across each phrase.',         color: '#F59E0B' },
  { icon: BookOpen,   title: 'Personalized Coaching',     desc: 'AI coaching tips tailored to your specific weak points every take.',   color: '#38BDF8' },
  { icon: BarChart3,  title: 'Progress Monitoring',       desc: 'Track improvement across sessions with comparative score history.',    color: '#FB923C' },
]

export default function Features() {
  return (
    <section id="features" className="w-full py-32 px-6"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

      <div className="max-w-5xl w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#FF3B5C' }}>
            Capabilities
          </p>
          <h2 className="text-5xl font-bold tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Everything your coach notices.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                className="gradient-border p-6 flex flex-col gap-4"
                style={{ transition: 'transform 0.22s ease' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: `${f.color}14`, border: `1px solid ${f.color}25` }}>
                  <Icon size={20} color={f.color} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5" style={{ fontSize: 15, letterSpacing: '-0.01em' }}>
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
