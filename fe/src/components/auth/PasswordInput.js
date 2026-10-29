import { useState } from 'react';

export default function PasswordInput({ id, label, error, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <label className="auth-field" htmlFor={id}>
      <span>{label}</span>
      <span className="password-control">
        <input id={id} type={visible ? 'text' : 'password'} aria-invalid={Boolean(error)} aria-describedby={errorId} {...inputProps} />
        <button type="button" className="password-toggle" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
          {visible ? 'Ẩn' : 'Hiện'}
        </button>
      </span>
      {error && <small className="field-error" id={errorId}>{error}</small>}
    </label>
  );
}
