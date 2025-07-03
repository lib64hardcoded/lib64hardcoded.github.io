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