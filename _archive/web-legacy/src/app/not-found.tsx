import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Page not found</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>The page you are looking for does not exist.</p>
      <Link
        href="/"
        style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: '#3B82F6', color: '#fff', textDecoration: 'none', fontSize: '1rem' }}
      >
        Go home
      </Link>
    </div>
  );
}
