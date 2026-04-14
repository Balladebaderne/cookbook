import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import LandingPage  from './pages/LandingPage'
import RecipeList   from './pages/RecipeList'
import RecipeDetail from './pages/RecipeDetail'
import RecipeForm   from './pages/RecipeForm'

function RecipeLayout({ children }) {
  const navigate = useNavigate()
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
            ✦ Cookbook
          </Link>
          <nav>
            <Link to="/recipes" className="nav-link">Opskrifter</Link>
            <button className="btn-primary" onClick={() => navigate('/recipes/new')}>
              + Ny opskrift
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/recipes" element={
          <RecipeLayout><RecipeList /></RecipeLayout>
        } />
        <Route path="/recipes/new" element={
          <RecipeLayout><RecipeForm /></RecipeLayout>
        } />
        <Route path="/recipes/:id" element={
          <RecipeLayout><RecipeDetail /></RecipeLayout>
        } />
        <Route path="/recipes/:id/edit" element={
          <RecipeLayout><RecipeForm /></RecipeLayout>
        } />
      </Routes>
    </BrowserRouter>
  )
}
