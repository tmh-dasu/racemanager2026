import { ReactNode } from "react";
import { Link } from "react-router-dom";
import AppNav from "./AppNav";

export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <main className="flex-1 pb-20 md:pb-8">
        {children}
      </main>
      <footer className="border-t border-border bg-secondary/50 py-6 pb-24 md:pb-6">
        <div className="container flex flex-col items-center gap-3 text-xs text-muted-foreground">
          <div className="flex gap-4 font-display">
            <Link to="/vilkaar" className="hover:text-foreground transition-colors">Vilkår</Link>
            <span className="text-border">|</span>
            <Link to="/regler" className="hover:text-foreground transition-colors">Regler</Link>
          </div>
          <p>© {new Date().getFullYear()} DASU RaceManager. Alle rettigheder forbeholdes.</p>
        </div>
      </footer>
    </div>
  );
}
