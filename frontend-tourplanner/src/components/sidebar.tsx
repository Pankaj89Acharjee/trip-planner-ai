"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { BarChart, Map, Thermometer, BookOpen, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const AppSidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { href: "/my-itineraries", label: "My Itineraries", icon: BookOpen },
    { href: "/booking-history", label: "Manage Bookings", icon: Receipt },
    { href: "/charts", label: "Charts", icon: BarChart },
    { href: "/map", label: "Map", icon: Map },
    { href: "/weather", label: "Weather", icon: Thermometer },
  ];

  return (
    <Sidebar className="bg-sidebar border-r border-sidebar-border mt-16 mr-4">
      <SidebarHeader className="p-4">
        <h2 className="text-lg font-semibold" role="heading" aria-level={2}>Quick Tools</h2>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="w-full justify-start"
                >
                  <item.icon className="h-6 w-6" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
