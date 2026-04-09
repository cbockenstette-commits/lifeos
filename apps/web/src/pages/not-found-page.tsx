import { Link } from 'react-router-dom';
import { PageHeader } from '../components/page-header.js';

export default function NotFoundPage(): JSX.Element {
  return (
    <>
      <PageHeader title="404" subtitle="That page doesn't exist." />
      <div className="p-6">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </>
  );
}
