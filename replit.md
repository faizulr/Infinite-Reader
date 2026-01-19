# Reflow PDF Reader

## Overview

Reflow PDF Reader is a distraction-free web application for reading PDF documents. It extracts text from PDFs and displays it in a clean, continuous, scrollable reading experience similar to browser Reader Mode. The app follows a brutally minimal design philosophy where the UI fades into the background, letting the content be the focus.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Web Application (Primary)
The application is built as a web-only solution located in the `web/` directory:

- **Framework**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS v4
- **PDF Processing**: pdfjs-dist (client-side text extraction)
- **Icons**: lucide-react
- **Build Output**: web/dist (served by Express backend)

### Key Features
- Drag & drop PDF upload
- Client-side text extraction (privacy-focused)
- Three themes: Light, Dark, Sepia
- Adjustable font size (14-28px)
- Responsive design (65ch max width for readability)
- Auto-hiding controls during reading

### Legacy Expo App (Deprecated)
The original React Native/Expo app in `client/` is deprecated due to PDF rendering issues on mobile platforms.

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
