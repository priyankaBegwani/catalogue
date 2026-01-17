# Branding Configuration Guide

## Overview
The application now supports configurable branding elements including logo, theme colors, brand name, and WhatsApp number. All settings are managed from the Settings page and stored in localStorage.

## Configurable Elements

### 1. **Brand Name**
- Default: "Indie Craft"
- Used in: Navbar, TopBar, Sidebar, Catalogue header, Login page, Setup page
- Storage key: `brand_name`

### 2. **Logo URL**
- Default: "/Logo indie.png"
- Supports both relative paths (e.g., `/logo.png`) and absolute URLs (e.g., `https://example.com/logo.png`)
- Used in: Navbar, TopBar, Login page, Setup page
- Storage key: `logo_url`

### 3. **Primary Color**
- Default: #1e3473
- Main brand color for buttons, links, and primary UI elements
- Storage key: `primary_color`
- Applied via CSS variable: `--color-primary`

### 4. **Secondary Color**
- Default: #6366f1
- Accent color for highlights and gradients
- Storage key: `secondary_color`
- Applied via CSS variable: `--color-secondary`

### 5. **WhatsApp Number**
- Default: Empty (optional)
- Format: Include country code (e.g., +1234567890)
- Used in: WhatsApp share functionality throughout the app (Catalogue page)
- Storage key: `whatsapp_number`

## How to Configure

### Admin Access
1. Navigate to **Settings** page (admin only)
2. Find the **Branding Configuration** section
3. Fill in the desired values:
   - **Brand Name**: Your business name
   - **Logo URL**: Path or URL to your logo image
   - **Primary Color**: Choose using color picker or enter hex code
   - **Secondary Color**: Choose using color picker or enter hex code
   - **WhatsApp Number**: Your business WhatsApp number with country code
4. Preview the theme colors in the preview section
5. Click **Save Settings**
6. Reload the page when prompted to apply changes

## Technical Implementation

### Files Created/Modified

#### New Files:
- `src/hooks/useBranding.ts` - Custom hook for accessing branding settings

#### Modified Files:
- `src/pages/Settings.tsx` - Added branding configuration UI
- `src/components/Navbar.tsx` - Uses configurable logo and brand name
- `src/components/TopBar.tsx` - Uses configurable logo and brand name
- `src/components/Sidebar.tsx` - Uses configurable brand name
- `src/pages/Login.tsx` - Uses configurable logo and brand name
- `src/pages/Setup.tsx` - Uses configurable logo and brand name
- `src/pages/Catalogue.tsx` - Uses configurable brand name and WhatsApp number

### Usage in Code

```typescript
import { useBranding, getWhatsAppUrl } from '../hooks/useBranding';

// In component
const branding = useBranding();

// Access branding values
<img src={branding.logoUrl} alt={branding.brandName} />
<h1>{branding.brandName}</h1>

// For WhatsApp sharing
const whatsappUrl = getWhatsAppUrl(message);
window.open(whatsappUrl, '_blank');
```

### Storage Keys
All settings are stored in localStorage:
- `brand_name`
- `logo_url`
- `primary_color`
- `secondary_color`
- `whatsapp_number`

### CSS Variables
Theme colors are automatically applied as CSS variables:
- `--color-primary`
- `--color-secondary`

## Features

### Logo Preview
- Real-time preview of logo in Settings page
- Automatic error handling for invalid URLs

### Color Preview
- Live preview of primary, secondary, and gradient colors
- Color picker and manual hex input

### WhatsApp Integration
- Automatically uses configured number in all share links
- Falls back to generic WhatsApp URL if no number configured
- Validates phone number format

### Auto-reload
- Settings changes require page reload to take effect
- User is prompted to reload after saving

## Default Values
If no settings are configured, the application uses these defaults:
- Brand Name: "Indie Craft"
- Logo URL: "/Logo indie.png"
- Primary Color: #1e3473
- Secondary Color: #6366f1
- WhatsApp Number: "" (empty)

## Notes
- Only admin users can access the Settings page
- Changes take effect immediately after page reload
- Settings persist across sessions (stored in localStorage)
- Logo images should be optimized for web use
- WhatsApp number must include country code for proper functionality
