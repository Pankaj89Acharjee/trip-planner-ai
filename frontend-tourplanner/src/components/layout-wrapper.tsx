"use client";

import { usePathname } from "next/navigation";
import AppSidebar from "@/components/sidebar";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  
  // Routes that should show the sidebar
  const sidebarRoutes = ["/"];
  
  const shouldShowSidebar = sidebarRoutes.includes(pathname);
  
  if (shouldShowSidebar) {
    return (
      <>
        <AppSidebar />
        <div className="flex-1 overflow-y-auto dark:bg-gradient-secondary bg-gradient-primary">
          {children}
        </div>
      </>
    );
  }
  
  // Full width layout for other routes
  return (
    <div className="flex-1 overflow-y-auto dark:bg-gradient-secondary bg-gradient-primary">
      {children}
    </div>
  );
}
