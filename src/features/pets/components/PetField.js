export default function PetField({ name, label, error, as = 'input', children, className = '', ...props }) {
  const Element = as;
  return <div className={`pet-field ${className}`}><label htmlFor={`pet-${name}`}>{label}</label>
    <Element id={`pet-${name}`} name={name} aria-invalid={!!error} aria-describedby={error ? `pet-${name}-error` : undefined} {...props}>{children}</Element>
    {error && <span className="pet-field-error" id={`pet-${name}-error`}>{error}</span>}
  </div>;
}
