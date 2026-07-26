import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="text-center py-24">
      <h1 className="text-3xl font-bold mb-2">404</h1>
      <p className="text-gray-600 mb-4">Page not found.</p>
      <Link to="/" className="text-blue-600 underline">Go home</Link>
    </div>
  );
}
