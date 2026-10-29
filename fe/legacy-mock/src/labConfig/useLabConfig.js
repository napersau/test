import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LAB_CONFIG_CHANGED, listLabItems, saveLabItem } from './labConfigRepository';

export default function useLabConfig() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(() => {
    try { setItems(listLabItems(user.id)); setError(''); }
    catch (problem) { setItems([]); setError(problem.message); }
    finally { setLoading(false); }
  }, [user.id]);
  useEffect(() => {
    refresh();
    window.addEventListener(LAB_CONFIG_CHANGED, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(LAB_CONFIG_CHANGED, refresh); window.removeEventListener('storage', refresh); };
  }, [refresh]);
  const save = async (values, id) => {
    if (saving) return undefined;
    setSaving(true);
    try { await Promise.resolve(); const result = saveLabItem(user.id, values, id); refresh(); return result; }
    finally { setSaving(false); }
  };
  return { items, loading, error, saving, refresh, save };
}
