import { findAccount, publicUser, registerCustomer, updateOwnProfile, verifyCredentials } from '../users/usersRepository';
import { recordActivity } from '../activity/auditStorage';

const SESSION_KEY = 'pawcare_auth_session';
const PROFILE_KEY = 'pawcare_customer_profile';

export const DEFAULT_ACCOUNT = {
  email: 'admin@admin',
  password: '123456',
};

function readJson(storage, key) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function getStoredSession() {
  const session = readJson(localStorage, SESSION_KEY) || readJson(sessionStorage, SESSION_KEY);
  if (!session) return null;
  const accountId = session.id === 'customer-default' ? 'admin-default' : session.id;
  try {
    const account = findAccount(accountId);
    if (account) {
      if (account.status !== 'ACTIVE') { clearSession(); return null; }
      return publicUser(account);
    }
    // Retain profiles created before the shared account repository was introduced.
    return session.role === 'CUSTOMER' ? session : null;
  } catch {
    return null;
  }
}

export function authenticate(identifier, password, remember) {
  try {
    const user = verifyCredentials(identifier, password);
    saveSession(user, remember);
    recordActivity({ actor: user, module: 'AUTH', action: 'LOGIN', targetId: user.id, targetName: 'Phiên đăng nhập' });
    return { success: true, user };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export function createCustomerAccount(profile, password) {
  const user = registerCustomer(profile, password);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  saveSession(user, true);
  return user;
}

export function saveSession(user, remember = true) {
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(SESSION_KEY);
  target.setItem(SESSION_KEY, JSON.stringify(user));
}

export function saveProfile(user) {
  const updated = findAccount(user.id) ? updateOwnProfile(user.id, user) : user;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  const persistent = localStorage.getItem(SESSION_KEY) !== null;
  saveSession(updated, persistent);
  return updated;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

