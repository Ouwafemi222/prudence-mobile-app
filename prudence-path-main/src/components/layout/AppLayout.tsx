import { Navbar } from "./Navbar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-background via-background to-accent/20">
      <Navbar />
      <main className="pt-20 pb-8 pb-[max(2rem,env(safe-area-inset-bottom))] px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
