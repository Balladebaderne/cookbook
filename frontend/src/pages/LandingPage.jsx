import { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router-dom'
import Globe, { COUNTRIES } from '../components/Globe'
import CountryPanel from '../components/CountryPanel'
import '../styles/landing.css'

function GlobeLoader() {
  return (
    <mesh>
      <sphereGeometry args={[2.2, 32, 32]} />
      <meshBasicMaterial color="#0a1830" wireframe />
    </mesh>
  )
}

export default function LandingPage() {
  const [selectedCountry, setSelectedCountry]   = useState(null)
  const [showIntro, setShowIntro]               = useState(true)

  // Hide intro text after animation completes (3 s)
  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 3100)
    return () => clearTimeout(t)
  }, [])

  const handleCountryClick = (country) => setSelectedCountry(country)
  const handleClosePanel   = ()        => setSelectedCountry(null)

  return (
    <div className="landing">
      {/* Intro animation */}
      {showIntro && (
        <div className="intro-overlay">
          <p className="intro-text">Hvilket land skal vi spise i dag?</p>
        </div>
      )}

      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <span className="landing-logo-title">Cookbook</span>
          <span className="landing-logo-sub">Verdenskøkkenet</span>
        </div>
        <nav className="landing-nav">
          <Link to="/recipes" className="landing-nav-link">Alle opskrifter</Link>
        </nav>
      </header>

      {/* Hint */}
      {!showIntro && (
        <p className="globe-hint">Klik på et pin for at se opskrifter</p>
      )}

      {/* 3D Globe */}
      <Canvas
        className="landing-canvas"
        camera={{ position: [0, 0, 6.5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={<GlobeLoader />}>
          <Globe onCountryClick={handleCountryClick} />
        </Suspense>
      </Canvas>

      {/* Bottom-left country buttons grouped by continent */}
      <div className="country-bar">
        {[
          { continent: "Europa", ids: ["italy", "france", "denmark"] },
          { continent: "Asien",  ids: ["japan", "india", "thailand"] },
          { continent: "Afrika", ids: ["morocco"] },
          { continent: "Amerika", ids: ["mexico"] },
        ].map(group => (
          <div key={group.continent} className="continent-group">
            <span className="continent-label">{group.continent}</span>
            <div className="continent-buttons">
              {group.ids.map(id => {
                const c = COUNTRIES.find(x => x.id === id)
                return (
                  <button
                    key={c.id}
                    className={`country-btn${selectedCountry?.id === c.id ? ' active' : ''}`}
                    onClick={() => handleCountryClick(c)}
                  >
                    <span className="country-btn-flag">{c.flag}</span>
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Slide-in panel */}
      <CountryPanel country={selectedCountry} onClose={handleClosePanel} />
    </div>
  )
}
