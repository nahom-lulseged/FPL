import { Link } from 'react-router-dom';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';

export function NotFoundPage() {
  return (
    <PlaceholderPage title="Page not found" phase="">
      <p className="text-white/70">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/my-team" className="mt-4 inline-block text-fpl-green hover:underline">
        Go to My Team
      </Link>
    </PlaceholderPage>
  );
}
