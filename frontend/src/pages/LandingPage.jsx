import Navbar        from '../components/landing/Navbar'
import HeroSection   from '../components/landing/HeroSection'
import HowItWorks    from '../components/landing/HowItWorks'
import LivePreview   from '../components/landing/LivePreview'
import Features      from '../components/landing/Features'
import Stats         from '../components/landing/Stats'
import FinalCTA      from '../components/landing/FinalCTA'

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: '#050505' }}>
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <LivePreview />
      <Features />
      <Stats />
      <FinalCTA />
    </div>
  )
}
