import type { HTMLInputTypeAttribute } from "react";

type Props = { name: string; label: string; type?: HTMLInputTypeAttribute; value: string; onChange: (value: string) => void; error?: string; hint?: string; autoComplete?: string; onBlur?: () => void; maxLength?: number };
export function FormField({ name, label, type = "text", value, onChange, error, hint, autoComplete, maxLength, onBlur }: Props) {
  return <div className="form-field">
    <label htmlFor={name}>{label}</label>
    <input id={name} name={name} type={type} value={value} onChange={event => onChange(event.target.value)} onBlur={onBlur} autoComplete={autoComplete} maxLength={maxLength} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined} />
    {hint && <p id={`${name}-hint`} className="field-hint">{hint}</p>}
    {error && <p id={`${name}-error`} className="field-error" role="alert">{error}</p>}
  </div>;
}
