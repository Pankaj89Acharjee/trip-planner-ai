"use client";

import { MountainSnow, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { SidebarTrigger } from "./ui/sidebar";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  const pathname = usePathname();
  
  // Routes that should show the sidebar trigger
  const sidebarRoutes = ["/"];
  const shouldShowSidebarTrigger = sidebarRoutes.includes(pathname);

  return (
    <header className="py-4 px-4 md:px-8 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50 flex items-center gap-4">
      {shouldShowSidebarTrigger && <SidebarTrigger />}
      <div className="container mx-auto flex justify-between items-center p-0">
        <Link href="/" className="flex items-center gap-2 group">
          <MountainSnow className="w-8 h-8 text-primary transition-transform group-hover:rotate-12 dark:text-purple-500/90 text-gray-700" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-purple-500/90 text-gray-700">
            EaseMyTripAI
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          {/* For Black Theme and Dark Theme Toggling */}
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
                <span className="sr-only">Select language</span>
              </Button>            
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem disabled>हिन्दी (Coming Soon)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
