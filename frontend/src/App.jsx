import { BrowserRouter, Navigate, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LandingPage  from "./pages/LandingPage";
import LoginPage    from "./pages/LoginPage";
import RecipeList   from "./pages/RecipeList";
import RecipeDetail from "./pages/RecipeDetail";
import RecipeForm   from "./pages/RecipeForm";

function RecipeLayout({ children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo" style={{ textDecoration: "none" }}>
            ✦ Cookbook
          </Link>
          <nav>
            <Link to="/recipes" className="nav-link">Recipes</Link>
            {user ? (
              <div className="nav-actions">
                <span className="nav-user">{user.name || user.email}</span>
                <button className="btn-secondary" onClick={logout}>
                  Log out
                </button>
                <button className="btn-primary" onClick={() => navigate("/recipes/new")}>
                  + New recipe
                </button>
              </div>
            ) : (
              <button className="btn-primary" onClick={() => navigate("/login")}>
                Log in
              </button>
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <RecipeLayout>
        <main className="main">
          <div className="loading"><div className="spinner" /> Loading user...</div>
        </main>
      </RecipeLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recipes" element={
            <RecipeLayout><RecipeList /></RecipeLayout>
          } />
          <Route path="/recipes/new" element={
            <RequireAuth>
              <RecipeLayout><RecipeForm /></RecipeLayout>
            </RequireAuth>
          } />
          <Route path="/recipes/:id" element={
            <RecipeLayout><RecipeDetail /></RecipeLayout>
          } />
          <Route path="/recipes/:id/edit" element={
            <RequireAuth>
              <RecipeLayout><RecipeForm /></RecipeLayout>
            </RequireAuth>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
