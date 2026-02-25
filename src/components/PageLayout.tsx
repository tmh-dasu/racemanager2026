import { ReactNode } from "react";
import AppNav from "./AppNav";

export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppNav />
      <main className="flex-1 pb-20 md:pb-8">
        {children}
      </main>
    </div>
  );
}
