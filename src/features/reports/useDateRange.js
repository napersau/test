import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clinicToday, dateOffset } from '../catalog/catalogPolicy';
import { validateRange } from './reportPolicy';

export default function useDateRange(required = false) {
  const [params, setParams] = useSearchParams();
  const from = params.get('from') ?? (required ? dateOffset(-29) : '');
  const to = params.get('to') ?? (required ? clinicToday() : '');
  useEffect(() => {
    if (required && (!params.has('from') || !params.has('to'))) {
      const next = new URLSearchParams(params);
      if (!next.has('from')) next.set('from', from);
      if (!next.has('to')) next.set('to', to);
      setParams(next, { replace: true });
    }
  }, [required, params, setParams, from, to]);
  const change = (values) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => { if (value || required) next.set(key, value); else next.delete(key); });
    setParams(next, { replace: true });
  };
  return { from, to, error: validateRange(from, to, required), change, required };
}
