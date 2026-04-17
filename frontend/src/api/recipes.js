const BASE = '/api/recipe/recipes'

async function request(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export function listRecipes() {
  return request(`${BASE}/`)
}

export function getRecipe(id) {
  return request(`${BASE}/${id}/`)
}

export function listRecipesByCountry(countryId) {
  return request(`${BASE}/country/${countryId}`)
}

export function createRecipe(payload) {
  return request(`${BASE}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateRecipe(id, payload) {
  return request(`${BASE}/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteRecipe(id) {
  return request(`${BASE}/${id}/`, { method: 'DELETE' })
}
