import type { Metadata } from 'next'

import { getBrandingServer } from '@/lib/branding-server';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingServer();
  const siteUrl = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://caldimproducts.com/calrims').replace(/\/$/, '');
  const canonicalUrl = `${siteUrl}/auth/login/`;
  
  return {
    metadataBase: new URL(siteUrl),
    title: `Sign In – ${branding.productName}`,
    description: `Sign in to your ${branding.productName} account to manage your AI-powered recruitment pipeline, view granular analytics, and hire exceptional talent seamlessly.`,
    openGraph: {
      title: `Sign In – ${branding.productName}`,
      description: `Sign in to your ${branding.productName} account to manage your AI-powered recruitment pipeline, view granular analytics, and hire exceptional talent seamlessly.`,
      images: [`${siteUrl}/logo.png`],
      type: 'website',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Sign In – ${branding.productName}`,
      description: `Sign in to your ${branding.productName} account to manage your AI-powered recruitment pipeline, view granular analytics, and hire exceptional talent seamlessly.`,
      images: [`${siteUrl}/logo.png`],
    },
    alternates: {
      canonical: canonicalUrl,
    }
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
