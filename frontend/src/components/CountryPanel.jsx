import { useEffect, useState } from 'react'
import RecipeCard from './RecipeCard'
import { listRecipesByCountry } from '../api/recipes'

export default function CountryPanel({ country, onClose }) {
  const [recipes, setRecipes]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const isOpen = !!country

  useEffect(() => {
    if (!country) return
    setLoading(true)
    setError(null)
    setRecipes([])
    listRecipesByCountry(country.id)
      .then(data => { setRecipes(data); setLoading(false) })
      .catch(() => { setError('Kunne ikke hente opskrifter.'); setLoading(false) })
  }, [country])

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className={`country-panel-backdrop${isOpen ? ' open' : ''}`}
      onClick={handleBackdropClick}
    >
      <aside className={`country-panel${isOpen ? ' open' : ''}`}>
        <button className="panel-close" onClick={onClose} aria-label="Luk">✕</button>

        {country && (
          <>
            <div className="panel-header">
              <span className="panel-flag">{country.flag}</span>
              <h2 className="panel-country-name">{country.name}</h2>
              <p className="panel-recipe-count">
                {loading ? '…' : `${recipes.length} ${recipes.length === 1 ? 'opskrift' : 'opskrifter'}`}
              </p>
              <div
                className="panel-accent"
                style={{ background: country.color }}
              />
            </div>

            <div className="panel-body">
              {loading && (
                <div className="panel-loading">
                  <div className="panel-spinner" />
                  <span>Henter opskrifter…</span>
                </div>
              )}

              {error && (
                <div className="panel-loading">
                  <span className="panel-empty-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && recipes.length === 0 && (
                <div className="panel-empty">
                  <span className="panel-empty-icon">🍽</span>
                  <span>Ingen opskrifter fra {country.name} endnu</span>
                </div>
              )}

              {!loading && !error && recipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
