import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import HomeContent from "@/components/HomeContent";
import { getSiteSettings } from "@/lib/site-settings";
import { buildPageMetadata } from "@/lib/seo";

const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || "https://nexgear.vn").replace(/\/+$/, "");

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const pageTitle = settings.site_title || settings.site_name;
  const pageDescription = settings.og_description || settings.site_description;

  return buildPageMetadata({
    title: pageTitle,
    description: pageDescription,
    path: "/",
    keywords: settings.site_keywords,
    ogTitle: settings.og_title || pageTitle,
    ogDescription: settings.og_description || pageDescription,
    ogImage: settings.og_image_url,
  });
}

export default async function Home() {
  const settings = await getSiteSettings();
  const pageTitle = settings.site_title || settings.site_name;
  const pageDescription = settings.og_description || settings.site_description;

  return (
    <>
      <Script
        id="home-page-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: pageTitle,
            url: SITE_URL,
            description: pageDescription,
            isPartOf: {
              "@type": "WebSite",
              name: settings.site_name,
              url: SITE_URL,
            },
          }),
        }}
      />
      <div className="min-h-screen flex flex-col pb-16 md:pb-0">
        <Navbar />
        <HomeContent />
        <Footer />
        <MobileNav />
      </div>
    </>
  );
}
