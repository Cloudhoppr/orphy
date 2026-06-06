import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const STATE_CONFIG = {
  idle:       { label: '',                  color: '#505050' },
  listening:  { label: 'Listening',         color: '#FF3B5C' },
  analyzing:  { label: 'Analyzing',         color: '#F59E0B' },
  responding: { label: 'Feedback ready',    color: '#22C55E' },
}

export default function DashboardNav({ appState }) {
  const nav = useNavigate()
  const cfg = STATE_CONFIG[appState]

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 60, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 20px',
      background: 'rgba(5,5,5,0.9)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <button
        onClick={() => nav('/')}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: '#A1A1AA' }}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = '#A1A1AA'}
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div className="flex items-center gap-2.5">
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF3B5C', boxShadow: '0 0 8px rgba(255,59,92,0.5)' }} />
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em' }}>Orphy</span>
      </div>

      <div style={{ minWidth: 100, textAlign: 'right' }}>
        {cfg.label && (
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: cfg.color }}>
            {cfg.label}
          </span>
        )}
      </div>
    </div>
  )
}
