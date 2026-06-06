import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const nav = useNavigate()

  return (
    <nav className="nav">
      <div className="nav__logo">
        <div className="nav__dot" />
        Orphy
      </div>

      <div className="flex items-center gap-6">
        <a href="#how" className="text-sm font-medium text-white/50 hover:text-white transition-colors duration-200 hidden sm:block">
          How it works
        </a>
        <a href="#features" className="text-sm font-medium text-white/50 hover:text-white transition-colors duration-200 hidden sm:block">
          Features
        </a>
        <button
          onClick={() => nav('/dashboard')}
          className="btn-primary !py-2.5 !px-5 !text-sm"
        >
          Start Singing
        </button>
      </div>
    </nav>
  )
}
