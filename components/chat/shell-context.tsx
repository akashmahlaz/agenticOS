"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ShellContextValue {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    // Return a no-op if not in a ShellProvider (e.g. on demo pages)
    return {
      drawerOpen: false,
      openDrawer: () => {},
      closeDrawer: () => {},
    };
  }
  return ctx;
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  return (
    <ShellContext.Provider value={{ drawerOpen, openDrawer, closeDrawer }}>
      {children}
    </ShellContext.Provider>
  );
}
