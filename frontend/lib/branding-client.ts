'use client';

import useSWR from 'swr';
import { APIClient } from '@/app/dashboard/lib/api-client';
import { getBranding, BrandingConfig } from './branding';

export function useBranding() {
  const { data: settings, error } = useSWR('/api/settings/branding', (url) => APIClient.get(url)) as { data: any, error: any };
  const branding = getBranding(settings);
  return {
    branding,
    isLoading: !settings && !error,
    isError: error,
  };
}
