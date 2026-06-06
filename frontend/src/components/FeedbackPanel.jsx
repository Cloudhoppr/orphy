const CoachIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M3 12a9 9 0 0 1 18 0"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
    />
    <rect x="2" y="14" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <rect x="18" y="14" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)

export default function FeedbackPanel({ feedback }) {
  return (
    <div className="feedback">
      <div className="feedback__card">
        <div className="feedback__head">
          <div className="feedback__badge">
            <CoachIcon />
          </div>
          <span className="feedback__tag">Orphy's Feedback</span>
        </div>

        <p className="feedback__summary">{feedback.summary}</p>
        <p className="feedback__narration">{feedback.narration}</p>

        <div className="feedback__fixes">
          <p className="feedback__fixes-head">Top Fixes</p>
          {feedback.fixes.map((fix, i) => (
            <div key={i} className="feedback__fix">
              <div className="feedback__num">{i + 1}</div>
              <p className="feedback__fix-text">{fix}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
