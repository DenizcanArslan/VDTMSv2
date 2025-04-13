export default function HomeLayout({ children }) {
  return (
    <div>
      {children}
    </div>
  );
}

// HTTP başlıklarını ayarla
export async function generateMetadata() {
  return {
    title: 'Home - Dashboard',
    description: 'Transport Management System Dashboard',
    metadataBase: new URL('https://example.com'),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      images: '/og-image.jpg',
    },
    other: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  };
} 