import { Metadata } from 'next';

import { getBrandingServer } from '@/lib/branding-server';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingServer();
  const siteUrl = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://caldimproducts.com/calrims').replace(/\/$/, '');
  const canonicalUrl = `${siteUrl}/terms/`;
  
  return {
    title: `Terms of Service – ${branding.productName}`,
    description: `Read the Terms of Service for ${branding.productName}, an AI-powered recruitment intelligence platform. Learn about our service agreements, rules, and guidelines.`,
    openGraph: {
      title: `Terms of Service – ${branding.productName}`,
      description: `Read the Terms of Service for ${branding.productName}, an AI-powered recruitment intelligence platform. Learn about our service agreements, rules, and guidelines.`,
      images: [branding.logoUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    }
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
