import { motion } from 'framer-motion'
import { Mic, Brain, TrendingUp } from 'lucide-react'

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
    <section id="how" className="relative w-full py-32 px-6"
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
            The Process
          </p>
          <h2 className="text-5xl font-bold tracking-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
            How Orphy works
          </h2>
          <p className="text-lg" style={{ color: '#A1A1AA' }}>
            Three steps from raw voice to real improvement.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,59,92,0.3), transparent)', top: '3.5rem' }} />

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
                className="gradient-border p-8 flex flex-col gap-5 cursor-default"
                style={{ transition: 'transform 0.25s ease, box-shadow 0.25s ease' }}
              >
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `${step.color}14`, border: `1px solid ${step.color}30` }}>
                    <Icon size={24} color={step.color} />
                  </div>
                  <span className="text-5xl font-bold" style={{ color: 'rgba(255,255,255,0.05)', letterSpacing: '-0.04em' }}>
                    {step.number}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
                    {step.title}
                  </h3>
                  <p className="leading-relaxed" style={{ color: '#A1A1AA', fontSize: 15 }}>
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
