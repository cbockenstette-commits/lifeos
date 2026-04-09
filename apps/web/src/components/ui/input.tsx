import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const INPUT_BASE =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input ref={ref} className={`${INPUT_BASE} ${className}`} {...props} />
    );
  },
);

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className = '', rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`${INPUT_BASE} resize-y ${className}`}
        {...props}
      />
    );
  },
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className = '', ...props }, ref) {
    return (
      <select ref={ref} className={`${INPUT_BASE} ${className}`} {...props} />
    );
  },
);

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className = '', ...props }: LabelProps): JSX.Element {
  return (
    <label
      className={`block text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}
      {...props}
    />
  );
}

interface FieldProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function Field({ label, error, children, htmlFor }: FieldProps): JSX.Element {
  return (
    <div className="space-y-1">
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
