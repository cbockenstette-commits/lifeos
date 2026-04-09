import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar.js';
import { Topbar } from './topbar.js';
import { ErrorBoundary } from '../error-boundary.js';

export function PageShell(): JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
