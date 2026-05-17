import { createContext, useContext, useEffect, useState } from 'react';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('gn_customer');
    if (raw) {
      try {
        setCustomer(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, []);

  function login(c) {
    setCustomer(c);
    localStorage.setItem('gn_customer', JSON.stringify(c));
  }

  function logout() {
    setCustomer(null);
    localStorage.removeItem('gn_customer');
  }

  return (
    <SessionContext.Provider value={{ customer, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
