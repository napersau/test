import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function useAdminCatalog(repository) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const mutationLock = useRef(false);
  const refresh = useCallback(() => {
    try { setItems(repository.list(user.id)); setError(''); }
    catch (problem) { setItems([]); setError(problem.message); }
    finally { setLoading(false); }
  }, [repository, user.id]);
  useEffect(() => {
    refresh();
    window.addEventListener(repository.event, refresh);
    window.addEventListener('storage', refresh);
    // Recompute date-sensitive inventory warnings when returning to this tab.
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener(repository.event, refresh);
      window.removeEventListener('storage', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, [refresh, repository.event]);
  const mutate = async (operation) => {
    if (mutationLock.current) throw new Error('Đang lưu dữ liệu, vui lòng chờ.');
    mutationLock.current = true;
    setSaving(true);
    try { await Promise.resolve(); const result = operation(); refresh(); return result; }
    finally { mutationLock.current = false; setSaving(false); }
  };
  return { items, loading, error, refresh, saving, save: (values, id) => mutate(() => repository.save(user.id, values, id)),
    importBatch: (id, values) => mutate(() => repository.importBatch(user.id, id, values)),
    adjustStock: (id, batchId, values) => mutate(() => repository.adjustStock(user.id, id, batchId, values)) };
}
