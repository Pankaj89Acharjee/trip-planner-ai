"use client";

import { MountainSnow, Globe, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { SidebarTrigger } from "./ui/sidebar";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  // Routes that should show the sidebar trigger
  const sidebarRoutes = ["/"];
  const shouldShowSidebarTrigger = sidebarRoutes.includes(pathname);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="py-4 px-2 md:px-2 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50 flex items-center gap-2">
      {shouldShowSidebarTrigger && <SidebarTrigger />}
      <div className="container mx-auto flex justify-between items-center p-0">
        <Link href="/" className="flex items-center gap-2 group">
          <MountainSnow className="w-8 h-8 text-primary transition-transform group-hover:rotate-12 dark:text-purple-500/90 text-gray-700" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-purple-500/90 text-gray-700 text-md md:text-lg">
            EaseMyTripAI
          </h1>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* For Black Theme and Dark Theme Toggling */}
          <ThemeToggle />

          {/* Language Selector - Hidden on very small screens */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sr-only">Select language</span>
              </Button>            
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem disabled>हिन्दी (Coming Soon)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Authentication Section */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-gray-300 text-gray-700">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || ''} />
                    <AvatarFallback>
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-500 opacity-90" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
              <Link href="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
