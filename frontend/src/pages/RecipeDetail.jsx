import { useState, useEffect } from 'react'

export default function RecipeDetail({ id, navigate }) {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/recipe/recipes/${id}/`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setRecipe(data); setLoading(false) })
      .catch(() => { setError('Kunne ikke hente opskrift.'); setLoading(false) })
  }, [id])

  const handleDelete = async () => {
    if (!confirm(`Slet "${recipe.title}"?`)) return
    try {
      const res = await fetch(`/api/recipe/recipes/${id}/`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      navigate('list')
    } catch {
      setError('Kunne ikke slette opskriften. Prøv igen.')
    }
  }

  if (loading) return (
    <main className="main">
      <div className="loading"><div className="spinner" /> Henter…</div>
    </main>
  )

  if (error) return (
    <main className="main">
      <button className="back-btn" onClick={() => navigate('list')}>← Tilbage</button>
      <div className="error-msg">{error}</div>
    </main>
  )

  const steps = Array.isArray(recipe.instructions) ? recipe.instructions : []

  return (
    <main className="main">
      <button className="back-btn" onClick={() => navigate('list')}>← Alle opskrifter</button>

      <h1 className="detail-title">{recipe.title}</h1>

      <div className="detail-meta">
        {recipe.time_minutes && <span>⏱ {recipe.time_minutes} minutter</span>}
        {recipe.price && <span>💰 {recipe.price} kr</span>}
        {recipe.servings && <span>👥 {recipe.servings} portioner</span>}
      </div>

      {recipe.tags?.length > 0 && (
        <div className="card-tags" style={{ marginBottom: '1.5rem' }}>
          {recipe.tags.map(t => <span key={t.id} className="tag">{t.name}</span>)}
        </div>
      )}

      {recipe.description && (
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.05rem', color: 'var(--brown)', lineHeight: 1.75, marginBottom: '1.75rem', paddingLeft: '1rem', borderLeft: '3px solid var(--brown-light)' }}>
          {recipe.description}
        </p>
      )}

      <div className="detail-actions">
        <button className="btn-primary" onClick={() => navigate('form', recipe.id, recipe)}>
          ✏ Rediger
        </button>
        <button className="btn-danger" onClick={handleDelete}>
          🗑 Slet
        </button>
        {recipe.link && (
          <a href={recipe.link} target="_blank" rel="noopener noreferrer" className="recipe-link">
            ↗ Originalkilde
          </a>
        )}
      </div>

      <div className="detail-body">
        {recipe.ingredients?.length > 0 && (
          <aside className="ingredients-card">
            <h2 className="section-title">Ingredienser</h2>
            <ul className="ingredient-list">
              {recipe.ingredients.map(ing => (
                <li key={ing.id} className="ingredient-item">
                  <span>{ing.name}</span>
                  <span className="ingredient-amount">{ing.amount} {ing.unit}</span>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {steps.length > 0 && (
          <section>
            <h2 className="section-title">Fremgangsmåde</h2>
            {steps.map((step, i) => (
              <div key={i} className="instruction-step">
                <div className="step-number">{i + 1}</div>
                <p className="step-text">{step.trim()}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}