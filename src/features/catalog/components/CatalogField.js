export default function CatalogField({ name, label, value, error, onChange, options, type = 'text', disabled = false, min, max, maxLength, rows }) {
  const inputId = `catalog-${name}`;
  const props = { id: inputId, name, value, disabled, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${inputId}-error` : undefined,
    onChange: (event) => onChange(name, event.target.value) };
  return <div className="admin-field">
    <label htmlFor={inputId}>{label}</label>
    {options ? <select {...props}>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>
      : type === 'textarea' ? <textarea {...props} rows={rows || 3} maxLength={maxLength} />
        : <input {...props} type={type} min={min} max={max} step={type === 'number' ? 1 : undefined} maxLength={maxLength} />}
    {error && <span className="admin-field-error" id={`${inputId}-error`}>{error}</span>}
  </div>;
}
