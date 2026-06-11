'use client';

import { SWRConfig } from 'swr';
import { fetcher } from '@/app/dashboard/lib/swr-fetcher';

export const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig 
      value={{
        fetcher,
        refreshInterval: 0,          // disabled: no background polling — manual refresh only
        revalidateOnFocus: false,    // disabled: prevents re-fetch on every browser tab switch
        revalidateOnReconnect: true,
        dedupingInterval: 5000,      // 5s: prevents duplicate requests on rapid navigation
        focusThrottleInterval: 30000 // 30s: even if re-enabled, throttle tab-focus revalidations
      }}
    >
      {children}
    </SWRConfig>
  );
};
