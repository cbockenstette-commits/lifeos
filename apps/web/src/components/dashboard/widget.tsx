import type { ReactNode } from 'react';

interface WidgetProps {
  title: string;
  count?: number | string;
  children: ReactNode;
  action?: ReactNode;
}

export function Widget({
  title,
  count,
  children,
  action,
}: WidgetProps): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-slate-400">({count})</span>
          )}
        </h3>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

export function WidgetEmpty({ text }: { text: string }): JSX.Element {
  return <div className="text-xs italic text-slate-400">{text}</div>;
}
