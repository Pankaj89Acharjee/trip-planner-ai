# Dark/Light Theme Implementation Guide

How to implement a complete dark/light theme system in a Next.js project using `next-themes` and Tailwind CSS.

## Overview

The theme system includes:
- Theme provider with client-side mounting
- Theme toggle component with hydration-safe implementation
- Automatic theme persistence
- System theme detection
- Smooth transitions between themes

## Prerequisites

- Next.js 13+ with App Router
- Tailwind CSS
- TypeScript (optional but recommended)

## Step 1: Install Dependencies

```bash
npm install next-themes
```

## Step 2: Configure Tailwind CSS

Update your `tailwind.config.ts` to include dark mode support as code below:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

## Step 3: Add CSS Variables

Update your `globals.css` to include theme-aware CSS variables:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@custom-variant dark (&:is(.dark *)); 

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Step 4: Create Theme Provider

Create `src/components/theme-provider.tsx`:

```typescript
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

## Step 5: Create Theme Toggle Component

Create `src/components/theme-toggle.tsx`:

```typescript
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

## Step 6: Update Root Layout

Update your `src/app/layout.tsx` to include the theme provider:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Your App",
  description: "Your app description",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Step 7: Add Theme Toggle to Header

Update your header component to include the theme toggle:

```typescript
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="hidden font-bold sm:inline-block">
              Your App
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Your navigation items */}
          </div>
          <nav className="flex items-center">
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
```

## Step 8: Using Theme-Aware Classes

Use Tailwind's dark mode classes in your components:

```typescript
export function Card() {
  return (
    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">Card Title</h2>
      <p className="text-gray-600 dark:text-gray-300">
        This card adapts to the current theme.
      </p>
    </div>
  );
}
```

## Key Features

### 1. Hydration Safety
- Both `ThemeProvider` and `ThemeToggle` use client-side mounting to prevent hydration mismatches
- Static fallback content is shown until the component mounts

### 2. System Theme Detection
- Automatically detects user's system preference
- Falls back to system theme when no preference is set

### 3. Theme Persistence
- User's theme choice is saved in localStorage
- Persists across browser sessions

### 4. Smooth Transitions
- CSS transitions can be added for smooth theme switching
- `disableTransitionOnChange` prevents flash during initial load

## Advanced Usage

### Custom Theme Colors
Add custom colors to your CSS variables:

```css
:root {
  --custom-primary: 220 70% 50%;
  --custom-secondary: 160 60% 45%;
}

.dark {
  --custom-primary: 220 70% 60%;
  --custom-secondary: 160 60% 55%;
}
```

### Theme-Aware Images
```typescript
import Image from "next/image";
import { useTheme } from "next-themes";

export function ThemedImage() {
  const { theme } = useTheme();
  
  return (
    <Image
      src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
      alt="Logo"
      width={100}
      height={100}
    />
  );
}
```

### Programmatic Theme Control
```typescript
import { useTheme } from "next-themes";

export function ThemeControls() {
  const { theme, setTheme, themes } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <div className="flex gap-2">
        {themes.map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`px-3 py-1 rounded ${
              theme === t ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## Troubleshooting

### Hydration Errors
- Ensure all theme-related components use client-side mounting
- Use `suppressHydrationWarning` on the `<html>` tag
- Check for server/client mismatches in theme-dependent rendering

### Theme Not Persisting
- Verify `next-themes` is properly installed
- Check browser's localStorage for theme values
- Ensure `ThemeProvider` wraps your entire app

### Styling Issues
- Verify CSS variables are properly defined
- Check Tailwind's dark mode configuration
- Ensure all components use theme-aware classes

## Best Practices

1. **Always use client-side mounting** for theme components
2. **Provide fallback content** during hydration
3. **Use CSS variables** for consistent theming
4. **Test both themes** thoroughly
5. **Consider accessibility** with proper contrast ratios
6. **Use semantic color names** instead of specific colors

This implementation provides a robust, hydration-safe theme system that works seamlessly with Next.js and Tailwind CSS.
