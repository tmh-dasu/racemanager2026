import { Link, useLocation } from "react-router-dom";
import { Home, Users, Trophy, ListOrdered, Flag, Settings, BookOpen } from "lucide-react";

const navItems = [
  { to: "/", label: "Hjem", icon: Home },
  { to: "/vaelg-hold", label: "Vælg Hold", icon: Users },
  { to: "/mit-hold", label: "Mit Hold", icon: Trophy },
  { to: "/rangering", label: "Rangering", icon: ListOrdered },
  { to: "/resultater", label: "Resultater", icon: Flag },
  { to: "/regler", label: "Regler", icon: BookOpen },
  { to: "/admin", label: "Admin", icon: Settings },
];

export default function AppNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:relative md:border-b md:border-t-0">
      <div className="container flex items-center justify-between gap-1 py-1 md:py-2">
        <Link to="/" className="hidden items-center gap-3 md:flex">
          <img src="/images/dasu-logo.png" alt="DASU" className="h-9 w-auto" />
          <img src="/images/supergt-logo.png" alt="Super GT Danmark" className="h-9 w-auto" />
          <span className="font-display text-lg font-bold tracking-wide text-foreground">
            Race Manager
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-around md:flex-none md:gap-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-xs transition-colors md:flex-row md:gap-1.5 md:px-3 md:py-2 md:text-sm ${
                  active
                    ? "text-accent-foreground bg-accent/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 md:h-4 md:w-4" />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
