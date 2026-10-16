import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function useCustomerData(reader, events) {
  const { user } = useAuth();
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const refresh = useCallback(() => {
    try { setData(reader(user.id)); setError(''); }
    catch (problem) { setData(null); setError(problem.message); }
    finally { setLoading(false); }
  }, [reader, user.id]);
  useEffect(() => {
    refresh(); events.forEach((event) => window.addEventListener(event, refresh));
    window.addEventListener('storage', refresh); document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, refresh));
      window.removeEventListener('storage', refresh); document.removeEventListener('visibilitychange', refresh); window.clearInterval(timer);
    };
  }, [refresh, events]);
  return { data, loading, error, refresh };
}
