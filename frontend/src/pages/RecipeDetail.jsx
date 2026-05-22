import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRecipe, deleteRecipe } from "../api/recipes";
import { useAuth } from "../auth/AuthContext";

export default function RecipeDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const [recipe, setRecipe]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    getRecipe(id)
      .then(data => { setRecipe(data); setLoading(false); })
      .catch(() => { setError("Could not load recipe."); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm(`Delete "${recipe.title}"?`)) return;
    try {
      await deleteRecipe(id);
      navigate("/recipes");
    } catch {
      setError("Could not delete the recipe. Please try again.");
    }
  };

  if (loading) return (
    <main className="main">
      <div className="loading"><div className="spinner" /> Loading…</div>
    </main>
  );

  if (error) return (
    <main className="main">
      <button className="back-btn" onClick={() => navigate("/recipes")}>← Back</button>
      <div className="error-msg">{error}</div>
    </main>
  );

  const steps = Array.isArray(recipe.instructions) ? recipe.instructions : [];

  return (
    <main className="main">
      <button className="back-btn" onClick={() => navigate("/recipes")}>← All recipes</button>

      {recipe.image && (
        <div className="detail-image">
          <img src={recipe.image} alt={recipe.title} />
        </div>
      )}

      <h1 className="detail-title">{recipe.title}</h1>

      <div className="detail-meta">
        {recipe.time_minutes && <span>⏱ {recipe.time_minutes} minutes</span>}
        {recipe.price && <span>💰 {recipe.price} kr</span>}
      </div>

      {recipe.tags?.length > 0 && (
        <div className="card-tags" style={{ marginBottom: "1.5rem" }}>
          {recipe.tags.map(t => <span key={t.id} className="tag">{t.name}</span>)}
        </div>
      )}

      {recipe.description && (
        <p className="detail-description">{recipe.description}</p>
      )}

      <div className="detail-actions">
        {user && (
          <>
            <button
              className="btn-primary"
              onClick={() => navigate(`/recipes/${id}/edit`, { state: { recipe } })}
            >
              Edit
            </button>
            <button className="btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </>
        )}
        {recipe.link && (
          <a href={recipe.link} target="_blank" rel="noopener noreferrer" className="recipe-link">
            ↗ Original source
          </a>
        )}
      </div>

      <div className="detail-body">
        {recipe.ingredients?.length > 0 && (
          <aside className="ingredients-card">
            <h2 className="section-title">Ingredients</h2>
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
            <h2 className="section-title">Instructions</h2>
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
  );
}
