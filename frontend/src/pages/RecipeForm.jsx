import { useState } from 'react'

const EMPTY = {
  title: '', description: '', time_minutes: '', price: '', link: '',
  ingredients: [{ name: '', amount: '', unit: '' }],
  tags: [{ name: '' }],
  instructions: [''],
}

function toForm(recipe) {
  if (!recipe) return EMPTY
  return {
    title: recipe.title || '',
    description: recipe.description || '',
    time_minutes: recipe.time_minutes ?? '',
    price: recipe.price ?? '',
    link: recipe.link || '',
    ingredients: recipe.ingredients?.length
      ? recipe.ingredients.map(i => ({ name: i.name, amount: i.amount ?? '', unit: i.unit ?? '' }))
      : [{ name: '', amount: '', unit: '' }],
    tags: recipe.tags?.length ? recipe.tags.map(t => ({ name: t.name })) : [{ name: '' }],
    instructions: recipe.instructions?.length ? recipe.instructions : [''],
  }
}

export default function RecipeForm({ recipe, navigate }) {
  const isEdit = !!recipe
  const [form, setForm] = useState(() => toForm(recipe))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  // Ingredients
  const updateIng = (i, field, val) => {
    const next = [...form.ingredients]; next[i] = { ...next[i], [field]: val }; set('ingredients', next)
  }
  const addIng = () => set('ingredients', [...form.ingredients, { name: '', amount: '', unit: '' }])
  const removeIng = i => set('ingredients', form.ingredients.filter((_, idx) => idx !== i))

  // Tags
  const updateTag = (i, val) => {
    const next = [...form.tags]; next[i] = { name: val }; set('tags', next)
  }
  const addTag = () => set('tags', [...form.tags, { name: '' }])
  const removeTag = i => set('tags', form.tags.filter((_, idx) => idx !== i))

  // Instructions
  const updateStep = (i, val) => {
    const next = [...form.instructions]; next[i] = val; set('instructions', next)
  }
  const addStep = () => set('instructions', [...form.instructions, ''])
  const removeStep = i => set('instructions', form.instructions.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Opskriften skal have et navn.'); return }
    setSaving(true); setError(null)

    const payload = {
      title: form.title,
      description: form.description,
      time_minutes: form.time_minutes ? Number(form.time_minutes) : null,
      price: form.price || null,
      link: form.link,
      ingredients: form.ingredients.filter(i => i.name.trim()).map(i => ({
        name: i.name, amount: i.amount || null, unit: i.unit || null
      })),
      tags: form.tags.filter(t => t.name.trim()),
      instructions: form.instructions.filter(s => s.trim()),
    }

    try {
      const url = isEdit ? `/api/recipe/recipes/${recipe.id}/` : '/api/recipe/recipes/'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      navigate('detail', saved.id || recipe?.id)
    } catch {
      setError('Kunne ikke gemme opskriften. Prøv igen.')
      setSaving(false)
    }
  }

  return (
    <div>
      <button className="back-btn" onClick={() => navigate(isEdit ? 'detail' : 'list', recipe?.id)}>
        ← {isEdit ? 'Tilbage til opskrift' : 'Tilbage'}
      </button>

      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Rediger opskrift' : 'Ny opskrift'}</h1>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div className="form-card">

        {/* Grundoplysninger */}
        <div className="form-section">
          <h2 className="form-section-title">Grundoplysninger</h2>
          <div className="form-group">
            <label>Navn *</label>
            <input type="text" placeholder="f.eks. Spaghetti Carbonara"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Beskrivelse</label>
            <textarea placeholder="Kort beskrivelse…"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tid (minutter)</label>
              <input type="number" placeholder="30"
                value={form.time_minutes} onChange={e => set('time_minutes', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Pris (kr)</label>
              <input type="text" placeholder="45.00"
                value={form.price} onChange={e => set('price', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Link til kilde</label>
            <input type="text" placeholder="https://…"
              value={form.link} onChange={e => set('link', e.target.value)} />
          </div>
        </div>

        {/* Ingredienser */}
        <div className="form-section">
          <h2 className="form-section-title">Ingredienser</h2>
          <div className="dynamic-list">
            {form.ingredients.map((ing, i) => (
              <div key={i} className="ingredient-row">
                <input type="text" placeholder="Navn" value={ing.name}
                  onChange={e => updateIng(i, 'name', e.target.value)} />
                <input type="text" placeholder="Mængde" value={ing.amount}
                  onChange={e => updateIng(i, 'amount', e.target.value)} />
                <input type="text" placeholder="Enhed" value={ing.unit}
                  onChange={e => updateIng(i, 'unit', e.target.value)} />
                <button className="btn-remove" onClick={() => removeIng(i)}
                  disabled={form.ingredients.length === 1}>×</button>
              </div>
            ))}
          </div>
          <button className="btn-add" onClick={addIng}>+ Tilføj ingrediens</button>
        </div>

        {/* Fremgangsmåde */}
        <div className="form-section">
          <h2 className="form-section-title">Fremgangsmåde</h2>
          <div className="dynamic-list">
            {form.instructions.map((step, i) => (
              <div key={i} className="dynamic-item">
                <span style={{ color: 'var(--brown)', fontSize: '0.8rem', minWidth: 20 }}>{i + 1}.</span>
                <textarea placeholder={`Trin ${i + 1}…`} value={step}
                  onChange={e => updateStep(i, e.target.value)} style={{ minHeight: 60 }} />
                <button className="btn-remove" onClick={() => removeStep(i)}
                  disabled={form.instructions.length === 1}>×</button>
              </div>
            ))}
          </div>
          <button className="btn-add" onClick={addStep}>+ Tilføj trin</button>
        </div>

        {/* Tags */}
        <div className="form-section">
          <h2 className="form-section-title">Tags</h2>
          <div className="dynamic-list">
            {form.tags.map((tag, i) => (
              <div key={i} className="dynamic-item">
                <input type="text" placeholder="f.eks. italiensk" value={tag.name}
                  onChange={e => updateTag(i, e.target.value)} />
                <button className="btn-remove" onClick={() => removeTag(i)}
                  disabled={form.tags.length === 1}>×</button>
              </div>
            ))}
          </div>
          <button className="btn-add" onClick={addTag}>+ Tilføj tag</button>
        </div>

        <div className="form-actions">
          <button className="btn-secondary"
            onClick={() => navigate(isEdit ? 'detail' : 'list', recipe?.id)}>
            Annullér
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Gemmer…' : isEdit ? 'Gem ændringer' : 'Opret opskrift'}
          </button>
        </div>
      </div>
    </div>
  )
}