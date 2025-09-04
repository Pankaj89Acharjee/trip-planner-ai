import { MountainSnow, Globe } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { SidebarTrigger } from "./ui/sidebar";

export default function Header() {
  return (
    <header className="py-4 px-4 md:px-8 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50 flex items-center gap-4">
      <SidebarTrigger />
      <div className="container mx-auto flex justify-between items-center p-0">
        <Link href="/" className="flex items-center gap-2 group">
          <MountainSnow className="w-8 h-8 text-primary transition-transform group-hover:rotate-12 text-purple-500/90" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            WanderWise
          </h1>
        </Link>
        <div className="flex items-center gap-4">
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
