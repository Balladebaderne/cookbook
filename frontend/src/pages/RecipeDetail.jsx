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
    await fetch(`/api/recipe/recipes/${id}/`, { method: 'DELETE' })
    navigate('list')
  }

  if (loading) return <div className="loading"><div className="spinner" /> Henter…</div>
  if (error) return (
    <>
      <button className="back-btn" onClick={() => navigate('list')}>← Tilbage</button>
      <div className="error-msg">{error}</div>
    </>
  )

  // Split description into intro + steps
  const rawDescription = recipe.description || ''
  const hasStepFormat = /Step \d+:/i.test(rawDescription)
  const intro = hasStepFormat
    ? rawDescription.split(/Step \d+:/i)[0].trim()
    : rawDescription

  // Build steps array
  const steps = Array.isArray(recipe.instructions) && recipe.instructions.length
    ? recipe.instructions
    : hasStepFormat
      ? rawDescription.split(/Step \d+:/i).filter(s => s.trim())
      : []

  return (
    <div>
      <button className="back-btn" onClick={() => navigate('list')}>← Alle opskrifter</button>

      <h1 className="detail-title">{recipe.title}</h1>

      <div className="detail-meta">
        {recipe.time_minutes && <span>⏱ {recipe.time_minutes} minutter</span>}
        {recipe.price && <span>💰 {recipe.price} kr</span>}
        {recipe.servings && <span>👥 {recipe.servings} portioner</span>}
      </div>

      {recipe.tags?.length > 0 && (
        <div className="card-tags" style={{ marginBottom: '1.25rem' }}>
          {recipe.tags.map(t => <span key={t.id} className="tag">{t.name}</span>)}
        </div>
      )}

      {intro && (
        <p style={{ color: 'var(--ink)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          {intro}
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
    </div>
  )
}