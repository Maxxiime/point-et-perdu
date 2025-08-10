import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import { Helmet } from "react-helmet-async";
import ThemeToggle from "@/components/ThemeToggle";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Helmet>
        <title>Pétanque facile – Jouer, Historique, Stats</title>
        <meta
          name="description"
          content="Application mobile-first, simple et claire pour gérer vos parties de pétanque."
        />
        <meta property="og:title" content="Pétanque facile" />
        <meta
          property="og:description"
          content="Application mobile-first, simple et claire pour gérer vos parties de pétanque."
        />
        <link
          rel="canonical"
          href={typeof window !== 'undefined' ? window.location.href : '/'}
        />
      </Helmet>
      <main className="container py-4">
        <header className="flex justify-end mb-2">
          <ThemeToggle />
        </header>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
