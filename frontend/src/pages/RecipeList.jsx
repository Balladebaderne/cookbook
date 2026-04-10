import { useState, useEffect } from 'react'

export default function RecipeList({ navigate }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/recipe/recipes/')
      .then(r => r.json())
      .then(data => { setRecipes(data); setLoading(false) })
      .catch(() => { setError('Kunne ikke hente opskrifter – er serveren kørende?'); setLoading(false) })
  }, [])

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.tags?.some(t => t.name.toLowerCase().includes(search.toLowerCase()))
  )

  // Count unique ingredients across all recipes
  const ingredientCount = new Set(
    recipes.flatMap(r => r.ingredients?.map(i => i.name) ?? [])
  ).size

  const tagCount = new Set(
    recipes.flatMap(r => r.tags?.map(t => t.name) ?? [])
  ).size

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <p className="hero-label">Balladebaderne · Samlingen</p>
            <h1 className="hero-title">
              Mad lavet<br />med <em>kærlighed</em>
            </h1>
            <p className="hero-sub">
              Del dine bedste opskrifter med gruppen. Fra hurtige hverdagsretter til imponerende middagsselskaber.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => navigate('form')}>
                + Ny opskrift
              </button>
              <button
                className="btn-ghost"
                onClick={() => document.getElementById('recipe-list-anchor')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Se samlingen
              </button>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-num">{loading ? '—' : recipes.length}</div>
              <div className="stat-label">Opskrifter</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-num">{loading ? '—' : tagCount}</div>
              <div className="stat-label">Tags</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-num">{loading ? '—' : ingredientCount}</div>
              <div className="stat-label">Ingredienser</div>
            </div>
          </div>
        </div>
      </section>

      {/* List */}
      <main className="main" id="recipe-list-anchor">
        <div className="section-header">
          <h2 className="section-title-lg">Alle opskrifter</h2>
          {!loading && (
            <span className="section-count">
              {filtered.length} {filtered.length === 1 ? 'opskrift' : 'opskrifter'}
            </span>
          )}
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <input
              type="text"
              placeholder="Søg i opskrifter eller tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading && <div className="loading"><div className="spinner" /> Henter opskrifter…</div>}
        {error && <div className="error-msg">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🍽</div>
            <h3>{search ? 'Ingen resultater' : 'Ingen opskrifter endnu'}</h3>
            <p>{search ? 'Prøv et andet søgeord' : 'Tilføj din første opskrift!'}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="recipe-grid">
            {filtered.map((recipe, index) => {
              const isFeatured = index === 0 && !search
              return (
                <div
                  key={recipe.id}
                  className={`recipe-card${isFeatured ? ' featured' : ''}`}
                  onClick={() => navigate('detail', recipe.id)}
                >
                  <div className="card-image">
                    <span className="card-image-text">✦</span>
                    {isFeatured && <span className="card-badge">Fremhævet</span>}
                  </div>
                  <div className="card-body">
                    {recipe.tags?.length > 0 && (
                      <div className="card-tags">
                        {recipe.tags.map(t => (
                          <span key={t.id} className="tag">{t.name}</span>
                        ))}
                      </div>
                    )}
                    <h2 className="card-title">{recipe.title}</h2>
                    {recipe.ingredients?.length > 0 && (
                      <p className="card-ingredients">
                        {recipe.ingredients.slice(0, 4).map(i => i.name).join(', ')}
                        {recipe.ingredients.length > 4 && ` +${recipe.ingredients.length - 4} mere`}
                      </p>
                    )}
                    <div className="card-footer">
                      {recipe.time_minutes && (
                        <span className="card-meta-item">
                          <span className="meta-dot" />
                          {recipe.time_minutes} min
                        </span>
                      )}
                      {recipe.price && (
                        <span className="card-meta-item">
                          <span className="meta-dot" />
                          {recipe.price} kr
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}