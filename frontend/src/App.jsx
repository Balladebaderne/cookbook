import { useState } from 'react'
import RecipeList from './pages/RecipeList'
import RecipeDetail from './pages/RecipeDetail'
import RecipeForm from './pages/RecipeForm'

export default function App() {
  const [page, setPage] = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [editRecipe, setEditRecipe] = useState(null)

  const navigate = (target, id = null, recipe = null) => {
    setPage(target)
    setSelectedId(id)
    setEditRecipe(recipe)
    window.scrollTo(0, 0)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <button className="logo" onClick={() => navigate('list')}>
            ✦ Cookbook
          </button>
          <nav>
            <button className="nav-link" onClick={() => navigate('list')}>Opskrifter</button>
            <button className="btn-primary" onClick={() => navigate('form')}>+ Ny opskrift</button>
          </nav>
        </div>
      </header>

      <main className="main">
        {page === 'list' && <RecipeList navigate={navigate} />}
        {page === 'detail' && selectedId && <RecipeDetail id={selectedId} navigate={navigate} />}
        {page === 'form' && <RecipeForm recipe={editRecipe} navigate={navigate} />}
      </main>
    </div>
  )
}