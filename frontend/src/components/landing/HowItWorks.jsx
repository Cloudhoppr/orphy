import { motion } from 'framer-motion'
import { Mic, Brain, TrendingUp } from 'lucide-react'

const WRAP = { maxWidth: 1040, width: '100%', marginLeft: 'auto', marginRight: 'auto', padding: '0 32px' }

const STEPS = [
  {
    icon: Mic,
    number: '01',
    title: 'Sing',
    description: 'Record yourself singing any song. Orphy listens to every note, breath, and phrase with precision.',
    color: '#FF3B5C',
  },
  {
    icon: Brain,
    number: '02',
    title: 'Analyze',
    description: 'AI evaluates pitch accuracy, rhythm timing, breath control, and vocal consistency in real time.',
    color: '#A78BFA',
  },
  {
    icon: TrendingUp,
    number: '03',
    title: 'Improve',
    description: 'Receive personalized coaching, measurable scores, and actionable fixes after every take.',
    color: '#22C55E',
  },
]

export default function HowItWorks() {
  return (
    <section
      id="how"
      style={{
        position: 'relative',
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
            The Process
          </p>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 12 }}>
            How Orphy works
          </h2>
          <p style={{ fontSize: 17, color: '#A1A1AA' }}>
            Three steps from raw voice to real improvement.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="gradient-border"
                style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20, cursor: 'default', transition: 'transform 0.25s ease' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${step.color}14`, border: `1px solid ${step.color}30`,
                  }}>
                    <Icon size={24} color={step.color} />
                  </div>
                  <span style={{ fontSize: 48, fontWeight: 700, color: 'rgba(255,255,255,0.05)', letterSpacing: '-0.04em' }}>
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 15, color: '#A1A1AA', lineHeight: 1.65 }}>
                    {step.description}
                  </p>
                </div>
                <div style={{ height: 2, background: `linear-gradient(90deg, ${step.color}60, transparent)`, borderRadius: 99 }} />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
