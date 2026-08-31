import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0" suppressHydrationWarning>
      <Navbar />
      <main className="flex-grow" suppressHydrationWarning>
        {children}
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
