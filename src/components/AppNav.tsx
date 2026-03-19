import { Link, useLocation } from "react-router-dom";
import { Home, Users, Trophy, ListOrdered, Flag, Settings, BookOpen, LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Hjem", icon: Home },
  { to: "/vaelg-hold", label: "Vælg Hold", icon: Users },
  { to: "/mit-hold", label: "Mit Hold", icon: Trophy },
  { to: "/rangering", label: "Leaderboard", icon: ListOrdered },
  { to: "/resultater", label: "Resultater", icon: Flag },
  { to: "/regler", label: "Regler", icon: BookOpen },
  { to: "/admin", label: "Admin", icon: Settings },
];

const mobileMainNav = [
  { to: "/", label: "Hjem", icon: Home },
  { to: "/vaelg-hold", label: "Hold", icon: Users },
  { to: "/mit-hold", label: "Mit Hold", icon: Trophy },
  { to: "/rangering", label: "Board", icon: ListOrdered },
];

export default function AppNav() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:block relative border-b border-border bg-card/95 backdrop-blur-md">
        <div className="container flex items-center justify-between gap-1 py-2">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/dasu-logo.png" alt="DASU" className="h-9 w-auto" />
            <img src="/images/supergt-logo.png" alt="Super GT Danmark" className="h-9 w-auto" />
            <span className="font-display text-lg font-bold tracking-wide text-foreground">
              Race Manager
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "text-accent-foreground bg-accent/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{label}</span>
                </Link>
              );
            })}
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Log ud</span>
              </button>
            ) : (
              <Link
                to="/login"
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  location.pathname === "/login"
                    ? "text-accent-foreground bg-accent/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LogIn className="h-4 w-4" />
                <span className="font-medium">Log ind</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-around py-1.5 px-1">
          {mobileMainNav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-[11px] transition-colors ${
                  active
                    ? "text-accent-foreground bg-accent/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-[11px] transition-colors ${
              moreOpen ? "text-accent-foreground bg-accent/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="font-medium">Mere</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" drawer */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-[60px] left-2 right-2 rounded-xl border border-border bg-card p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { to: "/resultater", label: "Resultater", icon: Flag },
              { to: "/regler", label: "Regler", icon: BookOpen },
              { to: "/admin", label: "Admin", icon: Settings },
            ].map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "text-accent-foreground bg-accent/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{label}</span>
                </Link>
              );
            })}
            <div className="my-1 h-px bg-border" />
            {user ? (
              <button
                onClick={() => { signOut(); setMoreOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Log ud</span>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span className="font-medium">Log ind</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}