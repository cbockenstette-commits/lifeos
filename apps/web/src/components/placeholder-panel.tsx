interface PlaceholderPanelProps {
  title: string;
  body: string;
  phase: string;
}

// P3 placeholder panel. Every page uses this so the shell is clearly
// "wired but not filled" — no invented UI that P4 has to undo.

export function PlaceholderPanel({
  title,
  body,
  phase,
}: PlaceholderPanelProps): JSX.Element {
  return (
    <div className="p-6">
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Coming in {phase}
        </div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
      </div>
    </div>
  );
}
