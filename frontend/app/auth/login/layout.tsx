import type { Metadata } from 'next'

import { getBrandingServer } from '@/lib/branding-server';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingServer();
  const siteUrl = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://caldimproducts.com/calrims').replace(/\/$/, '');
  const canonicalUrl = `${siteUrl}/auth/login/`;
  
  return {
    title: `Sign In – ${branding.productName}`,
    description: `Sign in to your ${branding.productName} account to manage your AI-powered recruitment pipeline, view granular analytics, and hire exceptional talent seamlessly.`,
    openGraph: {
      title: `Sign In – ${branding.productName}`,
      description: `Sign in to your ${branding.productName} account to manage your AI-powered recruitment pipeline, view granular analytics, and hire exceptional talent seamlessly.`,
      images: [branding.logoUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    }
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
