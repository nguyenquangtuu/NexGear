import type { Metadata } from "next";
import { Inter, Be_Vietnam_Pro } from "next/font/google";

import "./globals.css";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { getSiteSettings } from "@/lib/site-settings";
import { toAbsoluteUrl } from "@/lib/seo";
import { Toaster } from "react-hot-toast";

const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || "https://nexgear.vn").replace(/\/+$/, "");

const themeInitScript = `
(() => {
  try {
    const storageKey = 'nexgear-theme';
    const stored = localStorage.getItem(storageKey);
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : (systemDark ? 'dark' : 'light');
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["vietnamese", "latin"],
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const ogImageUrl = toAbsoluteUrl(settings.og_image_url);
  const keywords = settings.site_keywords
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: settings.site_name,
    manifest: "/site.webmanifest",
    title: {
      default: settings.site_title,
      template: `%s | ${settings.site_name}`,
    },
    description: settings.site_description,
    keywords,
    referrer: "origin-when-cross-origin",
    category: "shopping",
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: ["/favicon.ico"],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      url: SITE_URL,
      siteName: settings.site_name,
      title: settings.og_title || settings.site_title,
      description: settings.og_description || settings.site_description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: settings.site_name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.og_title || settings.site_title,
      description: settings.og_description || settings.site_description,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    verification: {
      other: {
        "zalo-platform-site-verification": ["NkwUDvUUDXHyaeGPeQKY5cIrZX-8orn9DZ0"],
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const logoUrl = toAbsoluteUrl(settings.og_image_url);

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${inter.variable} ${beVietnamPro.variable} h-full antialiased bg-background text-foreground`}
    >
      <body
        className="min-h-full bg-background font-sans text-foreground transition-colors duration-300"
        suppressHydrationWarning
      >
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <script
          id="organization-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: settings.site_name,
              url: SITE_URL,
              logo: logoUrl,
              sameAs: ["https://www.facebook.com/nexgearvn"],
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  email: "help@nexgear.vn",
                  availableLanguage: ["Vietnamese", "English"],
                },
              ],
            }),
          }}
        />
        <script
          id="website-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: settings.site_name,
              url: SITE_URL,
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/products?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <ThemeProvider defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppLoadingScreen />
          <SiteSettingsProvider initialSettings={settings}>
            <AuthProvider>
              <WishlistProvider>
                {children}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    style: {
                      borderRadius: '18px',
                      background: 'white',
                      color: '#1a1a1a',
                      fontSize: '14px',
                      fontWeight: '600',
                      padding: '12px 24px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    },
                    success: {
                      iconTheme: {
                        primary: '#22c55e',
                        secondary: 'white',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: 'white',
                      },
                    },
                  }}
                />
              </WishlistProvider>
            </AuthProvider>
          </SiteSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
