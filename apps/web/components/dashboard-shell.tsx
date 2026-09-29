'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SidebarNav } from './sidebar-nav';
import { Button } from './ui/button';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="flex items-center justify-between border-b p-4 md:hidden">
        <span className="text-lg font-semibold">Joboard</span>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="打开菜单">
          <Menu className="size-5" />
        </Button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="关闭菜单"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-background p-4 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-semibold">Joboard</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="关闭菜单">
                <X className="size-5" />
              </Button>
            </div>
            <div onClick={() => setOpen(false)}>
              <SidebarNav />
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="hidden w-56 shrink-0 border-r bg-muted/20 p-4 md:flex md:flex-col">
        <div className="mb-6 px-3 text-lg font-semibold">Joboard</div>
        <SidebarNav />
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
    </div>
  );
}
