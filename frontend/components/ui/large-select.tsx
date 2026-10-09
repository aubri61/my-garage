"use client";
import { useEffect, useId, useRef, useState } from "react";
export type SelectOption = { value: string; label: string };
export function LargeSelect({ label, value, options, onChange, disabled, required, placeholder = "선택해주세요" }: { label: string; value: string; options: SelectOption[]; onChange: (value: string) => void; disabled?: boolean; required?: boolean; placeholder?: string }) {
  const id = useId(), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const selected = options.find(option => option.value === value);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => { if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, open, id]);
  function choose(index: number) { const option = options[index]; if (option) onChange(option.value); setOpen(false); trigger.current?.focus(); }
  return <div className="form-field large-select" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span id={`${id}-label`}>{label}</span>
    <select hidden aria-hidden="true" tabIndex={-1} value={value} required={required} disabled={disabled} onChange={event => onChange(event.target.value)} onInvalid={event => { event.preventDefault(); trigger.current?.focus(); setOpen(true); }}><option value="">{placeholder}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    <button ref={trigger} type="button" role="combobox" aria-labelledby={`${id}-label`} aria-expanded={open && !disabled} aria-controls={`${id}-options`} aria-haspopup="listbox" aria-required={required} aria-activedescendant={open ? `${id}-option-${active}` : undefined} disabled={disabled} className="large-select-trigger" onClick={() => { setActive(Math.max(0, options.findIndex(option => option.value === value))); setOpen(!open); }} onKeyDown={event => {
      if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) event.preventDefault();
      if (event.key === "Escape") setOpen(false);
      else if (event.key === "ArrowDown" || event.key === "ArrowUp") { setOpen(true); setActive(previous => !open ? Math.max(0, options.findIndex(option => option.value === value)) : (previous + (event.key === "ArrowDown" ? 1 : -1) + options.length) % Math.max(options.length, 1)); }
      else if (event.key === "Home") { setOpen(true); setActive(0); }
      else if (event.key === "End") { setOpen(true); setActive(Math.max(0, options.length - 1)); }
      else if (event.key === "Enter" || event.key === " ") { if (open) choose(active); else setOpen(true); }
    }}><span>{selected?.label ?? placeholder}</span><span aria-hidden="true">⌄</span></button>
    {open && !disabled && <div id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`} className="large-select-options">{options.length ? options.map((option, index) => <button id={`${id}-option-${index}`} type="button" role="option" tabIndex={-1} aria-selected={value === option.value} className={active === index ? "active" : ""} key={option.value} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>{option.label}{value === option.value && <span aria-hidden="true">✓</span>}</button>) : <p>선택 가능한 항목이 없습니다.</p>}</div>}
  </div>;
}
