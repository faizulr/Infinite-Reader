# PDF Reader

## Overview

PDF Reader is a distraction-free mobile and web application for reading PDF documents with an emphasis on immersive, continuous reading. The app follows a brutally minimal design philosophy where the UI fades into the background, letting the document content be the focus. Key features include infinite scroll reading (no jarring page breaks), auto-hiding controls during reading, and a simple library for document management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Multi-Platform Architecture
The application is built as a cross-platform solution with two distinct frontends:

1. **React Native/Expo App** (primary) - Located in `client/` directory
   - Uses Expo SDK 54 with the new architecture enabled
   - Stack-only navigation pattern (no tabs) with three screens: Library, Reader, Settings
   - React Navigation for native stack navigation
   - Reanimated for smooth animations
   - AsyncStorage for local document persistence
   - TanStack Query for server state management

2. **Web Application** - Located in `web/` directory
   - Standalone Vite + React + TypeScript app
   - Tailwind CSS for styling
   - Uses pdf.js directly for PDF rendering
   - Simpler architecture focused on web-only experience

### Backend Architecture
- **Express.js server** running on Node.js with TypeScript
- Located in `server/` directory
- Minimal API structure with CORS configured for Replit domains
- Uses in-memory storage by default (`MemStorage` class)
- Drizzle ORM configured for PostgreSQL (database not yet provisioned)

### Data Layer
- **Schema Definition**: `shared/schema.ts` using Drizzle ORM with Zod validation
- **Current Schema**: Basic users table with id, username, password
- **Client Storage**: AsyncStorage for documents and settings (completely local)
- **Database Config**: PostgreSQL ready via `drizzle.config.ts`

### Design Patterns
- **Path Aliases**: `@/` maps to `client/`, `@shared/` maps to `shared/`
- **Theming**: Light/dark mode support with semantic color tokens in `client/constants/theme.ts`
- **Component Architecture**: Themed wrapper components (ThemedText, ThemedView) for consistent styling
- **Error Handling**: Custom ErrorBoundary with development-mode debugging

### Build System
- **Expo Scripts**: Custom build process via `scripts/build.js` for static web export
- **Server Build**: esbuild for server bundling
- **Development**: Concurrent Expo and Express server development

## External Dependencies

### Core Dependencies
- **Expo SDK 54** - React Native framework with managed workflow
- **React Navigation 7** - Native stack navigation
- **TanStack Query** - Server state management
- **Drizzle ORM** - TypeScript ORM for PostgreSQL

### PDF Processing
- **pdfjs-dist** - Mozilla's PDF.js library for web PDF rendering
- **react-native-pdf-light** - Native PDF rendering for mobile

### Database
- **PostgreSQL** - Primary database (requires `DATABASE_URL` environment variable)
- **pg** - PostgreSQL client for Node.js

### UI/UX Libraries
- **react-native-reanimated** - Smooth animations
- **react-native-gesture-handler** - Gesture handling
- **expo-haptics** - Haptic feedback on supported devices
- **expo-document-picker** - File selection
- **expo-file-system** - Local file management
- **@react-native-async-storage/async-storage** - Persistent local storage

### Fonts
- **@expo-google-fonts/nunito** - Custom font family
- **Google Fonts** (web) - Inter and Merriweather

### Development Tools
- **TypeScript** - Type safety
- **ESLint** with Expo config - Linting
- **Prettier** - Code formatting
- **Tailwind CSS** (web only) - Utility-first CSS