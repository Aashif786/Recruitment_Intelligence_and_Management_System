import type { Metadata } from 'next'

import { getBrandingServer } from '@/lib/branding-server';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingServer();
  const siteUrl = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://caldimproducts.com/calrims').replace(/\/$/, '');
  const canonicalUrl = `${siteUrl}/auth/register/`;
  
  return {
    title: `Create Account – ${branding.productName}`,
    description: `Create your ${branding.productName} account to start automating your recruitment natively with AI interviews, skill scoring, and intelligent candidate matching.`,
    openGraph: {
      title: `Create Account – ${branding.productName}`,
      description: `Create your ${branding.productName} account to start automating your recruitment natively with AI interviews, skill scoring, and intelligent candidate matching.`,
      images: [branding.logoUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    }
  };
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
