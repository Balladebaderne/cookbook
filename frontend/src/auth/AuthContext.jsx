import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUser,
  getAuthToken,
  getMe,
  login as loginRequest,
  storeAuthToken,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));

  const persistAuth = useCallback((nextToken, nextUser) => {
    storeAuthToken(nextToken);
    setToken(nextToken || null);
    setUser(nextUser || null);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    getMe(token)
      .then(currentUser => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) persistAuth(null, null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [persistAuth, token]);

  const login = useCallback(async (credentials) => {
    const result = await loginRequest(credentials);
    persistAuth(result.token, result.user);
    return result.user;
  }, [persistAuth]);

  const register = useCallback(async (payload) => {
    const result = await createUser(payload);
    persistAuth(result.token, result.user);
    return result.user;
  }, [persistAuth]);

  const logout = useCallback(() => {
    persistAuth(null, null);
  }, [persistAuth]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    register,
    logout,
  }), [loading, login, logout, register, token, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
