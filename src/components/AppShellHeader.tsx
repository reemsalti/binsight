import { LogOut, Shield } from "lucide-react";
import type { DemoUser } from "../mock-data/demoUser";
import { formatGreeting } from "../utils/greeting";

type Props = {
  user: DemoUser;
};

export function AppShellHeader({ user }: Props) {
  const greeting = formatGreeting(user.name);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-slate-950 md:text-xl">
            {greeting}
          </h1>
          <p className="mt-0.5 type-muted">
            Warehouse operations dashboard
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <p className="type-emphasis">{user.role}</p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              <Shield size={12} />
              {user.accessLevel}
            </span>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
