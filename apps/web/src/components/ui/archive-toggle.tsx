import { useSearchParams } from 'react-router-dom';

// Standardized archive toggle backed by the URL search param
// `?includeArchived=true`. Shared across every list view so users get
// consistent behavior and the state survives navigation/refresh.

export function useIncludeArchived(): {
  includeArchived: boolean;
  setIncludeArchived: (next: boolean) => void;
} {
  const [params, setParams] = useSearchParams();
  const includeArchived = params.get('includeArchived') === 'true';
  const setIncludeArchived = (next: boolean): void => {
    const nextParams = new URLSearchParams(params);
    if (next) nextParams.set('includeArchived', 'true');
    else nextParams.delete('includeArchived');
    setParams(nextParams, { replace: true });
  };
  return { includeArchived, setIncludeArchived };
}

export function ArchiveToggle(): JSX.Element {
  const { includeArchived, setIncludeArchived } = useIncludeArchived();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
      <input
        type="checkbox"
        checked={includeArchived}
        onChange={(e) => setIncludeArchived(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
      />
      Show archived
    </label>
  );
}
