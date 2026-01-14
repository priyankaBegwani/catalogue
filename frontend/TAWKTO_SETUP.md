# Tawk.to Customer Support Chat Setup Guide

This application includes integrated Tawk.to customer support chat for retailers and guest users.

## Features

- ✅ Live chat widget for non-admin users (retailers and guests)
- ✅ Automatic user information sharing (name, email, role)
- ✅ Configurable via admin Settings page
- ✅ Environment variable support for deployment
- ✅ Admin users don't see the chat widget

## Setup Instructions

### Option 1: Using Admin Settings Page (Recommended)

1. **Create a Tawk.to Account**
   - Go to [https://www.tawk.to](https://www.tawk.to)
   - Sign up for a free account

2. **Get Your Credentials**
   - Log in to [Tawk.to Dashboard](https://dashboard.tawk.to)
   - Go to **Administration → Channels → Chat Widget**
   - Click on your property
   - Select **Direct Chat Link**
   - Copy the URL which looks like: `https://embed.tawk.to/[PROPERTY_ID]/[WIDGET_ID]`
   - Extract the `PROPERTY_ID` and `WIDGET_ID` from the URL

3. **Configure in Application**
   - Log in as an admin user
   - Navigate to **Settings** from the sidebar
   - Enter your Property ID and Widget ID
   - Click **Save Settings**
   - Reload the page when prompted

### Option 2: Using Environment Variables

1. Create a `.env` file in the `frontend` directory:
   ```bash
   cp .env.example .env
   ```

2. Add your Tawk.to credentials:
   ```env
   VITE_TAWKTO_PROPERTY_ID=your_property_id_here
   VITE_TAWKTO_WIDGET_ID=your_widget_id_here
   ```

3. Restart the development server

## Configuration Priority

The application checks for Tawk.to credentials in the following order:
1. **localStorage** (set via Settings page) - Highest priority
2. **Environment variables** (.env file) - Fallback

## Customization

### Widget Appearance
- Customize the chat widget appearance in your [Tawk.to Dashboard](https://dashboard.tawk.to)
- Go to **Administration → Chat Widget → Appearance**
- Change colors, position, and behavior

### Widget Behavior
You can programmatically control the widget using the `TawkToAPI` helper:

```typescript
import { TawkToAPI } from '../hooks/useTawkTo';

// Show the widget
TawkToAPI.showWidget();

// Hide the widget
TawkToAPI.hideWidget();

// Maximize the chat window
TawkToAPI.maximize();

// Minimize the chat window
TawkToAPI.minimize();

// Toggle the chat window
TawkToAPI.toggle();

// Set custom attributes
TawkToAPI.setAttributes({
  customField: 'value'
});

// Add an event
TawkToAPI.addEvent('eventName', {
  metadata: 'value'
});
```

## User Information Shared

The following user information is automatically shared with Tawk.to:
- **Name**: User's full name
- **Email**: User's email address
- **Role**: User's role (retailer, guest, etc.)
- **User ID**: Unique user identifier

## Troubleshooting

### Chat widget not appearing?

1. **Check if you're logged in as admin**
   - The chat widget only appears for non-admin users
   - Log out and log in as a retailer or guest user

2. **Verify credentials**
   - Go to Settings page and check if Property ID and Widget ID are set
   - Make sure there are no extra spaces or special characters

3. **Check browser console**
   - Open browser developer tools (F12)
   - Look for any Tawk.to related errors

4. **Clear cache and reload**
   - Clear browser cache
   - Hard reload the page (Ctrl+Shift+R or Cmd+Shift+R)

### Widget appears but doesn't work?

1. **Verify Tawk.to account status**
   - Log in to Tawk.to dashboard
   - Make sure your account is active
   - Check if the widget is enabled

2. **Check network connectivity**
   - Ensure `embed.tawk.to` is not blocked by firewall
   - Check browser network tab for failed requests

## Support

For Tawk.to specific issues:
- [Tawk.to Help Center](https://help.tawk.to)
- [Tawk.to API Documentation](https://developer.tawk.to)

For application-specific issues:
- Contact your system administrator
- Check application logs
