import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authenticate, clearSession, createCustomerAccount, getStoredSession, saveProfile } from '../features/auth/authStorage';
import { USERS_CHANGED } from '../features/users/usersRepository';
import { recordActivity } from '../features/activity/auditStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredSession());
  useEffect(() => {
    const syncSession = () => setUser(getStoredSession());
    window.addEventListener(USERS_CHANGED, syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener(USERS_CHANGED, syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    login(identifier, password, remember) {
      const result = authenticate(identifier, password, remember);
      if (result.success) setUser(result.user);
      return result;
    },
    register(profile, password) {
      const customer = createCustomerAccount(profile, password);
      setUser(customer);
      return customer;
    },
    updateProfile(profile) {
      const updatedUser = saveProfile({ ...user, ...profile });
      setUser(updatedUser);
      return updatedUser;
    },
    logout() {
      clearSession();
      if (user) recordActivity({ actor: user, module: 'AUTH', action: 'LOGOUT', targetId: user.id, targetName: 'Phiên đăng nhập' });
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
