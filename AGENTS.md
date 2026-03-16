# AGENTS.md - Pumato Development Guide

This document provides guidelines for agents working on the Pumato codebase.

## Project Overview

Pumato is a food delivery web application built with Next.js 16, React 19, and Firebase. It supports multiple service types: food delivery, grocery, laundry, and delivery partner management.

## Build, Lint, and Test Commands

### Development
```bash
pnpm dev          # Start development server
pnpm build        # Build for production (static export)
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm deploy       # Build and deploy to Firebase Hosting
```

### Running a Single Test
**No test framework is currently configured.** If adding tests, use Vitest or Jest with:
```bash
pnpm vitest run --test-name-pattern="test name"  # Vitest
pnpm jest --testNamePattern="test name"          # Jest
```

### ESLint
The project uses `eslint-config-next` with core-web-vitals rules. Run with:
```bash
pnpm lint
```

## Code Style Guidelines

### File Organization
- **App Router**: Use Next.js App Router (`app/` directory)
- **Components**: Place in `app/components/`, `app/[service]/components/`
- **Hooks**: Place in `app/hooks/`
- **Context**: Place in `app/context/`
- **Lib/Utils**: Place in `lib/` for shared utilities
- **Path Aliases**: Use `@/*` for imports (e.g., `@/lib/supabase`, `@/app/components/Navbar`)

### JavaScript
- This project uses **JavaScript** (not TypeScript)
- Avoid adding TypeScript unless explicitly requested

### Naming Conventions
- **Components**: PascalCase (e.g., `RestaurantList.js`, `CartDrawer.js`)
- **Functions/variables**: camelCase (e.g., `addToCart`, `isLoaded`)
- **Files**: kebab-case for non-component files (e.g., `cartPricing.js`, `useFirestore.js`)
- **Hooks**: Prefix with `use` (e.g., `useCart`, `useFirestore`)

### Imports
Order imports consistently:
1. Next.js/React imports (`next/link`, `next/image`)
2. Third-party libraries (`lucide-react`, `framer-motion`)
3. Internal components/hooks
4. Lib/utils
5. Relative imports (`./`)

Example:
```javascript
import Link from "next/link";
import { Clock, Utensils } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useCart } from "@/app/context/CartContext";
import { format12h } from "@/lib/utils";
import "./styles.css";
```

### Client/Server Components
- Add `"use client"` directive at the top of files using React hooks (`useState`, `useEffect`, `useContext`, etc.)
- Server components are the default in App Router

### React Patterns
- Use functional components with hooks
- Memoize expensive calculations with `useMemo`
- Memoize callback functions with `useCallback` when passing to child components
- Use `useEffect` for side effects with proper cleanup
- Always clean up subscriptions in useEffect return (e.g., `return () => unsubscribe()`)

### Error Handling
- Wrap async operations in try/catch blocks
- Use `console.error` for logging errors (no external logging services)
- Return error objects from async functions: `{ success: false, message: "..." }`
- Handle missing/null values gracefully with optional chaining and nullish coalescing

Example:
```javascript
try {
    const { data, error } = await supabase.functions.invoke("manage-coupons", {
        body: { action: "FETCH_BY_CODE", payload: { code: uppercaseCode } }
    });
    if (error || !coupon) return { success: false, message: "Invalid Coupon Code" };
} catch (err) {
    console.error("Coupon error:", err);
    return { success: false, message: "Validation error" };
}
```

### Styling
- **Tailwind CSS v4**: Use utility classes for all styling
- **Conditional classes**: Use `clsx` and `tailwind-merge` via `cn()` utility
- **Responsive design**: Use mobile-first approach with `md:`, `lg:` prefixes

Example:
```javascript
import { cn } from "@/lib/utils";

// In component:
className={cn(
    "base-classes",
    isActive && "active-classes",
    isClosed && "opacity-60 grayscale-[0.5]"
)}
```

### Firebase & Supabase
- **Firebase**: Firestore for real-time data (restaurants, orders, settings)
- **Supabase**: For coupon management and additional backend logic
- Use environment variables for all API keys (`NEXT_PUBLIC_*` for client-side)
- Handle missing credentials gracefully with console warnings

### State Management
- Use React Context for global state (`CartContext.js`)
- Use local state (`useState`) for component-specific state
- Use `useReducer` for complex state with multiple actions

### Component Structure
- Keep components focused and small
- Extract reusable logic into custom hooks
- Use composition over inheritance

### Accessibility
- Use semantic HTML elements
- Include alt text for images
- Use proper button/link elements

### Performance
- Use `next/image` with `fill` and `sizes` props for optimized images
- Use `priority` prop for above-the-fold images
- Lazy load components when appropriate
- Use `next/link` for client-side navigation

### Constants and Configuration
- Store constants in `lib/constants.js`
- Store site-wide settings in Firebase Firestore (`site_content` collection)
- Environment variables in `.env.local` (never commit secrets)

## Environment Variables

Required variables (see `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
```

## Supabase Edge Functions

Located in `supabase/functions/`. Deploy with:
```bash
supabase functions deploy <function-name>
```

## Firebase

- **Firestore**: Main database for restaurants, orders, settings
- **Firebase Admin**: Server-side operations
- **FCM**: Push notifications (see `send-fcm-notification`)

## Deployment

Build is static export (`output: 'export'` in next.config.mjs). Deploy to Firebase Hosting:
```bash
pnpm deploy
```
