import { Link } from 'react-router-dom'

export default function RecipeCard({ recipe }) {
  return (
    <Link to={`/recipes/${recipe.id}`} className="recipe-panel-card">
      <div className="recipe-card-img-wrap">
        {recipe.image
          ? <img src={recipe.image} alt={recipe.title} className="recipe-card-img" />
          : <div className="recipe-card-img-placeholder">✦</div>
        }
        <div className="recipe-card-img-fade" />
      </div>
      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{recipe.title}</h3>
        {recipe.description && (
          <p className="recipe-card-desc">{recipe.description}</p>
        )}
        <div className="recipe-card-meta">
          {recipe.time_minutes && <span>⏱ {recipe.time_minutes} min</span>}
          {recipe.price && <span>💰 {recipe.price} kr</span>}
        </div>
      </div>
    </Link>
  )
}
