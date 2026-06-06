import WaveformVisualizer from './WaveformVisualizer'
import FeedbackPanel from './FeedbackPanel'

const MicIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M5 10a7 7 0 0 0 14 0"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    />
    <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8"  y1="21" x2="16" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const STATE_LABELS = {
  idle:       '',
  listening:  'Listening',
  analyzing:  'Analyzing',
  responding: 'Feedback ready',
}

export default function AudioSection({ appState, feedback, onStart, onStop, onReset }) {
  const label = STATE_LABELS[appState]

  return (
    <div className={`audio${appState === 'listening' ? ' audio--listening' : ''}`}>
      {label && (
        <span className={`audio__label audio__label--${appState}`}>{label}</span>
      )}

      {/* ── Idle ── */}
      {appState === 'idle' && (
        <div className="mic-wrap">
          <button className="mic" onClick={onStart} aria-label="Start listening">
            <MicIcon />
          </button>
          <span className="mic__caption">Listen to audio</span>
        </div>
      )}

      {/* ── Listening ── */}
      {appState === 'listening' && (
        <div className="mic-wrap">
          <button className="mic mic--on" aria-label="Recording — click to stop" onClick={onStop}>
            <MicIcon />
          </button>
          <WaveformVisualizer />
          <button className="btn-stop" onClick={onStop}>
            Stop Singing
          </button>
        </div>
      )}

      {/* ── Analyzing ── */}
      {appState === 'analyzing' && (
        <div className="analyzing">
          <div className="spinner" />
          <p className="analyzing__text">Analyzing your take…</p>
          <div className="progress-track">
            <div className="progress-fill" />
          </div>
        </div>
      )}

      {/* ── Responding ── */}
      {appState === 'responding' && feedback && (
        <>
          <FeedbackPanel feedback={feedback} />
          <button className="btn-reset" onClick={onReset}>
            Try another take
          </button>
        </>
      )}
    </div>
  )
}
