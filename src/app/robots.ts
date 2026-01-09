import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://upj-cart.com';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin-dashboard/', '/merchant-dashboard/', '/callback/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}