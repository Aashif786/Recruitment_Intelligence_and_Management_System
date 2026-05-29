import { API_BASE_URL } from './config';
import { getBranding, BrandingConfig } from './branding';

export async function getBrandingServer(): Promise<BrandingConfig> {
  try {
    // Fetch settings from the backend API
    const res = await fetch(`${API_BASE_URL}/api/settings/branding`, { 
      next: { revalidate: 60 } // Cache for 1 minute
    });
    if (res.ok) {
      const data = await res.json();
      return getBranding(data);
    }
  } catch (err) {
    console.error("Failed to fetch branding on server:", err);
  }
  
  // Fallback to env variables and default constants
  return getBranding(null);
}
