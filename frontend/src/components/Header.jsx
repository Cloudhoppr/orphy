const STATUS_LABELS = {
  listening:  'Listening',
  analyzing:  'Analyzing',
  responding: 'Feedback ready',
}

export default function Header({ appState }) {
  const label = STATUS_LABELS[appState]

  return (
    <header className="header">
      <div className="header__logo">
        <div className={`header__dot${appState !== 'idle' ? ' header__dot--pulse' : ''}`} />
        Orphy
      </div>
      <div className="header__right">
        {label && (
          <span className={`header__status header__status--${appState}`}>
            {label}
          </span>
        )}
      </div>
    </header>
  )
}
