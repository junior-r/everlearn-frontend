import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface CenteredCardProps {
  brand: string;
  wide?: boolean;
  children: ReactNode;
}

/** Full-height page shell with one centred card, used by the auth and onboarding screens. */
export function CenteredCard({ brand, wide = false, children }: CenteredCardProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div
        className={cn(
          "w-full rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8",
          wide ? "max-w-lg" : "max-w-sm",
        )}
      >
        <p className="text-sm font-semibold tracking-tight text-brand">{brand}</p>
        {children}
      </div>
    </main>
  );
}

export function PageStatus({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p role="status" className="text-sm text-muted">
        {children}
      </p>
    </main>
  );
}
