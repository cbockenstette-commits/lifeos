import { NavLink } from 'react-router-dom';
import { useUiStore } from '../../stores/ui-store.js';

interface NavItem {
  to: string;
  label: string;
  exact?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/areas', label: 'Areas' },
  { to: '/projects', label: 'Projects' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/resources', label: 'Resources' },
  { to: '/sprints', label: 'Sprints' },
  { to: '/tags', label: 'Tags' },
];

export function Sidebar(): JSX.Element {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  if (!sidebarOpen) return <></>;

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
      <div className="p-4">
        <div className="text-lg font-bold tracking-tight text-slate-900">
          lifeos
        </div>
        <div className="text-xs text-slate-500">PARA + weekly sprints</div>
      </div>
      <nav className="px-2 pb-6">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  [
                    'block rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
