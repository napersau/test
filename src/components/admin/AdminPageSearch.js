import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ADMIN_NAVIGATION } from '../../constants/adminNavigation';
import AdminIcon from './AdminIcon';

const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
export default function AdminPageSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const results = ADMIN_NAVIGATION.filter((item) => normalize(`${item.label} ${item.keywords}`).includes(normalize(query.trim())));
  return <form className="admin-page-search" role="search" onSubmit={(event) => { event.preventDefault(); if (query.trim() && results.length) { setOpen(false); setQuery(''); navigate(results[0].to); } }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
    <AdminIcon name="search" /><input type="search" aria-label="Tìm trang quản trị" aria-controls={open && query.trim() ? 'admin-search-results' : undefined} placeholder="Tìm trang quản trị…" value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} /><kbd>↵</kbd>
    {open && query.trim() && <div className="admin-search-results" id="admin-search-results"><span>TRANG QUẢN TRỊ</span>{results.length ? <ul>{results.map((item) => <li key={item.to}><Link to={item.to} onClick={() => { setOpen(false); setQuery(''); }}><AdminIcon name={item.icon} />{item.label}<AdminIcon name="arrow" /></Link></li>)}</ul> : <p role="status">Không tìm thấy trang phù hợp.</p>}</div>}
  </form>;
}
