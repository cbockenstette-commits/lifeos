import { HEALTH_CHECK_NAME } from '@lifeos/shared';

export default function App(): JSX.Element {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight">lifeos</h1>
        <p className="mt-4 text-lg text-slate-600">
          Personal life management — PARA + weekly sprints.
        </p>
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            P0 scaffolding status
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Shared package resolved</dt>
              <dd className="font-mono text-emerald-600">{HEALTH_CHECK_NAME}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">API health check</dt>
              <dd className="font-mono text-slate-400">/api/health</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
