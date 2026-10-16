import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listPets, PETS_CHANGED, savePet, setPetStatus } from './petsRepository';

export default function usePets() {
  const { user } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const refresh = useCallback(() => {
    try { setPets(listPets(user.id)); setError(''); }
    catch (problem) { setPets([]); setError(problem.message); }
    finally { setLoading(false); }
  }, [user.id]);
  useEffect(() => {
    refresh();
    window.addEventListener(PETS_CHANGED, refresh); window.addEventListener('storage', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener(PETS_CHANGED, refresh); window.removeEventListener('storage', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [refresh]);
  const mutate = async (operation) => {
    if (lock.current) throw new Error('Đang lưu hồ sơ, vui lòng chờ.');
    lock.current = true; setSaving(true);
    try { await Promise.resolve(); const result = operation(); refresh(); return result; }
    finally { lock.current = false; setSaving(false); }
  };
  return { pets, loading, error, saving, refresh, save: (values, id) => mutate(() => savePet(user.id, values, id)),
    setStatus: (id, status) => mutate(() => setPetStatus(user.id, id, status)) };
}
