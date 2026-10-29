import { useCallback, useEffect, useState } from 'react';
import { createUser, listUsers, updateUser, USERS_CHANGED } from './usersRepository';
import { useAuth } from '../../contexts/AuthContext';

export default function useUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(() => {
    try {
      setUsers(listUsers(user.id));
      setError('');
    } catch (problem) {
      setError(problem.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    refresh();
    window.addEventListener(USERS_CHANGED, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(USERS_CHANGED, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const save = async (values, id) => {
    if (saving) return;
    setSaving(true);
    try {
      await Promise.resolve();
      const result = id ? updateUser(user.id, id, values) : createUser(user.id, values);
      refresh();
      return result;
    } finally {
      setSaving(false);
    }
  };
  return { users, loading, error, saving, refresh, save };
}
