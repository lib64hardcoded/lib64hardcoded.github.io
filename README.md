# Prodomo Server Dashboard

A comprehensive server management dashboard built with React, TypeScript, and Tailwind CSS. Supports both Supabase and localStorage for flexible deployment options.

## Features

- 🔐 **User Authentication** - Multi-level access control (Guest, V4, V5, Admin)
- 📁 **File Management** - Upload and manage server files with version control
- 📝 **Patch Notes** - Create and publish version updates
- 🐛 **Bug Tracking** - Report and manage bug reports
- 📊 **Analytics** - Monitor downloads, user activity, and system metrics
- 📚 **Documentation** - Built-in documentation system
- 🛡️ **IP Protection** - Guest session abuse prevention
- 🌙 **Dark Mode** - Full dark/light theme support
- 📱 **Responsive** - Mobile-friendly design

## Storage Options

The application supports two storage modes:

### 1. Supabase (Recommended for Production)
- Full database functionality with Supabase
- Secure authentication and storage
- Automatic schema creation and sample data
- Supports all features including file uploads

### 2. localStorage (Development/Demo)
- Falls back to browser localStorage when no Supabase credentials are provided
- All features work with local storage
- Perfect for quick demos or development without database setup

## Quick Start

### Option 1: With Supabase

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Clone the project** and install dependencies:
   ```bash
   npm install
   ```

3. **Set up the database**:
   - Go to the SQL Editor in your Supabase dashboard
   - Run the SQL script from `supabase/migrations/create_tables.sql`
   - This creates all necessary tables and sample data

4. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase settings:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

### Option 2: localStorage Only (No Supabase)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

The application will automatically use localStorage when no Supabase configuration is provided.

## Default Accounts

The system comes with these pre-configured accounts:

- **Admin**: `admin@prodomo.local` / `admin123` (Token: `T0KEN`)
- **V4 User**: `v4@prodomo.local` / `v4pass`
- **V5 User**: `v5@prodomo.local` / `v5pass`
- **Guest Access**: 5-minute temporary sessions

## Project Structure

```
src/
├── components/          # React components
├── contexts/           # React contexts (Auth, Theme)
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── supabase.ts     # Supabase client and types
│   ├── notifications.ts # Toast notifications
│   ├── security.ts     # Security and rate limiting
│   └── ipProtection.ts # IP protection system
└── main.tsx           # Application entry point

supabase/
└── migrations/        # SQL migration files for Supabase
```

## Building for Production

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your web server

3. **Set up your production Supabase project** using the SQL script in `supabase/migrations/create_tables.sql`

4. **Configure environment variables** for your production Supabase project

## Features Overview

### User Management
- Multi-level access control (Guest, V4, V5, Admin)
- User creation, editing, and blocking
- Profile management with admin notes
- Guest session management with IP protection

### File Management
- Upload server files with version control
- Support for multiple file types (server, plugin, archive, documentation)
- Download tracking and analytics
- File requirements management

### Documentation System
- Create and manage documentation with categories
- Support for V4/V5 specific documentation
- Automatic table of contents generation
- Spoiler sections for long content

### Bug Tracking
- Comprehensive bug reporting system
- Severity and category classification
- Status tracking (open, in-progress, resolved, closed)
- User notifications for status updates

### Analytics Dashboard
- Download statistics and trends
- User activity monitoring
- Network usage tracking
- System health metrics

### Security Features
- Rate limiting for login attempts
- IP protection for guest sessions
- Input sanitization and validation
- Session management and timeouts

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Database**: Supabase (with localStorage fallback)
- **Charts**: Chart.js with React Chart.js 2
- **Icons**: Lucide React
- **Notifications**: iziToast
- **Build Tool**: Vite

## License

This project is private and proprietary. All rights reserved.