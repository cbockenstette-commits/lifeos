interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = 'Loading…' }: SpinnerProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      <span>{label}</span>
    </div>
  );
}

export function CenteredSpinner({ label }: SpinnerProps): JSX.Element {
  return (
    <div className="flex h-40 items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}
