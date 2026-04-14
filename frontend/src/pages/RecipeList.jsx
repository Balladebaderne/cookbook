import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

export default function RecipeList() {
  const navigate = useNavigate()
  const [recipes, setRecipes]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
  const [activeTag, setActiveTag] = useState(null)

  useEffect(() => {
    fetch('/api/recipe/recipes/')
      .then(r => r.json())
      .then(data => { setRecipes(data); setLoading(false) })
      .catch(() => { setError('Kunne ikke hente opskrifter.'); setLoading(false) })
  }, [])

  const allTags = useMemo(() => {
    const set = new Set()
    recipes.forEach(r => r.tags?.forEach(t => set.add(t.name)))
    return [...set].sort()
  }, [recipes])

  const filtered = recipes.filter(r => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.tags?.some(t => t.name.toLowerCase().includes(search.toLowerCase()))
    const matchesTag = !activeTag || r.tags?.some(t => t.name === activeTag)
    return matchesSearch && matchesTag
  })

  return (
    <main className="main">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Verdenskøkkenet
      </button>

      <div className="section-header">
        <h1 className="section-title-lg">Alle opskrifter</h1>
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
        {allTags.length > 0 && (
          <div className="tag-filters">
            <button
              className={`tag-filter-btn${!activeTag ? ' active' : ''}`}
              onClick={() => setActiveTag(null)}
            >
              Alle
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-filter-btn${activeTag === tag ? ' active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="loading"><div className="spinner" /> Henter opskrifter…</div>}
      {error && <div className="error-msg">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🍽</div>
          <h3>{search || activeTag ? 'Ingen resultater' : 'Ingen opskrifter endnu'}</h3>
          <p>{search || activeTag ? 'Prøv et andet søgeord eller filter' : 'Tilføj din første opskrift!'}</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="recipe-grid">
          {filtered.map(recipe => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              <div className="card-image">
                {recipe.image
                  ? <img src={recipe.image} alt={recipe.title} />
                  : <span className="card-image-text">✦</span>
                }
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
          ))}
        </div>
      )}
    </main>
  )
}
