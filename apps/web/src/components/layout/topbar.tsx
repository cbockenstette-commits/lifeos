import { useUiStore } from '../../stores/ui-store.js';
import { useCurrentUser } from '../../hooks/use-current-user.js';

export function Topbar(): JSX.Element {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const user = useCurrentUser();

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4">
      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        aria-label="Toggle sidebar"
      >
        ☰
      </button>
      <div className="text-xs text-slate-500">
        {user.data ? (
          <span>
            {user.data.name} · {user.data.timezone}
          </span>
        ) : (
          <span>loading…</span>
        )}
      </div>
    </header>
  );
}
