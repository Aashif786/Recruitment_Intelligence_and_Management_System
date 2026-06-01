import type { Metadata } from 'next'
import { getBrandingServer } from '@/lib/branding-server';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingServer();
  const siteUrl = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://caldimproducts.com/calrims').replace(/\/$/, '');
  const canonicalUrl = `${siteUrl}/jobs/`;
  
  return {
    metadataBase: new URL(siteUrl),
    title: `Browse Open Roles – ${branding.productName}`,
    description: `Explore open positions and apply through ${branding.productName}, the AI-powered recruitment platform.`,
    openGraph: {
      title: `Browse Open Roles – ${branding.productName}`,
      description: `Explore open positions and apply through ${branding.productName}, the AI-powered recruitment platform.`,
      images: [`${siteUrl}/logo.png`],
      type: 'website',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Browse Open Roles – ${branding.productName}`,
      description: `Explore open positions and apply through ${branding.productName}, the AI-powered recruitment platform.`,
      images: [`${siteUrl}/logo.png`],
    },
    alternates: {
      canonical: canonicalUrl,
    }
  };
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
