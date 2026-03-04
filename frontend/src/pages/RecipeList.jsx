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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Opskrifter</h1>
        <p className="page-subtitle">{recipes.length} opskrifter i samlingen</p>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          {!search && <span className="search-icon">⌕</span>}
          <input
            type="text"
            placeholder=""
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
          {filtered.map(recipe => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => navigate('detail', recipe.id)}
            >
              <div className="card-body">
                <h2 className="card-title">{recipe.title}</h2>
                <div className="card-meta">
                  {recipe.time_minutes && <span>⏱ {recipe.time_minutes} min</span>}
                  {recipe.price && <span>💰 {recipe.price} kr</span>}
                </div>
                {recipe.ingredients?.length > 0 && (
                  <p className="card-ingredients">
                    {recipe.ingredients.slice(0, 4).map(i => i.name).join(', ')}
                    {recipe.ingredients.length > 4 && ` +${recipe.ingredients.length - 4} mere`}
                  </p>
                )}
                {recipe.tags?.length > 0 && (
                  <div className="card-tags">
                    {recipe.tags.map(t => <span key={t.id} className="tag">{t.name}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}