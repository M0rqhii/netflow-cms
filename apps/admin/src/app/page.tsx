export default function HomePage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">Netflow CMS</h1>
      <p className="text-gray-600 mb-6">Admin Panel</p>
      <a href="/dashboard" className="btn btn-primary" style={{ ['--grad' as any]: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
        Go to Hub
      </a>
    </div>
  );
}

