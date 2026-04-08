import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);

  // Load from localStorage on startup
  useEffect(() => {
    const t = localStorage.getItem("dw_token");
    const u = localStorage.getItem("dw_user");
    if (t && u) {
      setToken(t);
      setUser(JSON.parse(u));
    }
  }, []);

  const login = (tokenVal, userVal) => {
    setToken(tokenVal);
    setUser(userVal);
    localStorage.setItem("dw_token", tokenVal);
    localStorage.setItem("dw_user", JSON.stringify(userVal));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("dw_token");
    localStorage.removeItem("dw_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
