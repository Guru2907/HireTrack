import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [name, setName] = useState(localStorage.getItem('userName') || '');

  const login = (newToken, newName) => {
    localStorage.setItem('token', newToken);
    if (newName) localStorage.setItem('userName', newName);
    setToken(newToken);
    setName(newName || '');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setName('');
  };

  return (
    <AuthContext.Provider value={{ token, name, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);