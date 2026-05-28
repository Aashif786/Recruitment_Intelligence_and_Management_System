export interface BrandingConfig {
  companyName: string;
  productName: string;
  logoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  footerText: string;
  supportEmail: string;
  themeColor: string;
  termsUrl: string;
  privacyUrl: string;
  seoTitleDefault: string;
  seoDescriptionDefault: string;
}

export const BRANDING_DEFAULTS: BrandingConfig = {
  companyName: 'Caldim Engineering',
  productName: 'CAL-RIMS',
  logoUrl: '/calrims/logo.png',
  darkLogoUrl: '/calrims/logo-dark.png',
  faviconUrl: '/calrims/logo.png',
  footerText: 'Powered by Caldim Engineering. Built for teams who care about who they hire.',
  supportEmail: 'support@caldimproducts.com',
  themeColor: '#2563eb', // Default blue color
  termsUrl: '/calrims/terms/',
  privacyUrl: '/calrims/privacy/',
  seoTitleDefault: 'CAL-RIMS - AI-Powered Recruitment Intelligence System',
  seoDescriptionDefault: 'CAL-RIMS is an AI-powered automated recruitment platform for seamless hiring, empowering teams to find, evaluate, and hire top-tier talent efficiently.',
};

export function getBranding(settings: any): BrandingConfig {
  // DB has highest priority, then env variables, then default constants
  const companyName = settings?.company_name || process.env.NEXT_PUBLIC_COMPANY_NAME || BRANDING_DEFAULTS.companyName;
  const productName = settings?.product_name || process.env.NEXT_PUBLIC_PRODUCT_NAME || BRANDING_DEFAULTS.productName;
  const logoUrl = settings?.company_logo_url || process.env.NEXT_PUBLIC_LOGO_URL || BRANDING_DEFAULTS.logoUrl;
  const darkLogoUrl = settings?.dark_logo_url || process.env.NEXT_PUBLIC_DARK_LOGO_URL || BRANDING_DEFAULTS.darkLogoUrl;
  const faviconUrl = settings?.favicon_url || process.env.NEXT_PUBLIC_FAVICON_URL || BRANDING_DEFAULTS.faviconUrl;
  const footerText = settings?.footer_text || process.env.NEXT_PUBLIC_FOOTER_TEXT || BRANDING_DEFAULTS.footerText;
  const supportEmail = settings?.support_email || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || BRANDING_DEFAULTS.supportEmail;
  const themeColor = settings?.theme_color || process.env.NEXT_PUBLIC_THEME_COLOR || BRANDING_DEFAULTS.themeColor;
  const termsUrl = settings?.terms_url || process.env.NEXT_PUBLIC_TERMS_URL || BRANDING_DEFAULTS.termsUrl;
  const privacyUrl = settings?.privacy_url || process.env.NEXT_PUBLIC_PRIVACY_URL || BRANDING_DEFAULTS.privacyUrl;
  const seoTitleDefault = settings?.seo_title_default || process.env.NEXT_PUBLIC_SEO_TITLE_DEFAULT || BRANDING_DEFAULTS.seoTitleDefault;
  const seoDescriptionDefault = settings?.seo_description_default || process.env.NEXT_PUBLIC_SEO_DESCRIPTION_DEFAULT || BRANDING_DEFAULTS.seoDescriptionDefault;

  return {
    companyName,
    productName,
    logoUrl,
    darkLogoUrl,
    faviconUrl,
    footerText,
    supportEmail,
    themeColor,
    termsUrl,
    privacyUrl,
    seoTitleDefault,
    seoDescriptionDefault,
  };
}
