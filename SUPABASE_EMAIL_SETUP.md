# Supabase Email Template Configuration

## Custom Email Branding Setup

To customize the password reset emails with your brand name and email address instead of the default Supabase branding, follow these steps:

### 1. Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Email Templates**

### 2. Configure SMTP Settings (Custom Email Address)

To use your own email address (e.g., `noreply@indiecraft.com`) instead of Supabase's default:

1. Go to **Project Settings** → **Authentication**
2. Scroll down to **SMTP Settings**
3. Enable **Enable Custom SMTP**
4. Configure your SMTP provider details:
   - **SMTP Host**: Your email provider's SMTP server (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`)
   - **SMTP Port**: Usually `587` for TLS or `465` for SSL
   - **SMTP User**: Your email address or SMTP username
   - **SMTP Password**: Your email password or API key
   - **Sender Email**: `noreply@indiecraft.com` (or your preferred email)
   - **Sender Name**: `Indiecraft` (or your brand name)

#### Popular SMTP Providers:

**Gmail:**
- Host: `smtp.gmail.com`
- Port: `587`
- Note: You'll need to use an App Password, not your regular password

**SendGrid:**
- Host: `smtp.sendgrid.net`
- Port: `587`
- User: `apikey`
- Password: Your SendGrid API key

**AWS SES:**
- Host: `email-smtp.us-east-1.amazonaws.com` (adjust region)
- Port: `587`
- User: Your SMTP username from AWS
- Password: Your SMTP password from AWS

### 3. Customize Email Template

1. In **Authentication** → **Email Templates**
2. Select **Reset Password** template
3. Customize the template with your branding:

```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>We received a request to reset your password for your Indiecraft account.</p>

<p>Click the button below to reset your password:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #your-brand-color; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>If you didn't request this password reset, you can safely ignore this email.</p>

<p>This link will expire in 24 hours.</p>

<p>Best regards,<br>
The Indiecraft Team</p>

<hr>
<p style="font-size: 12px; color: #666;">
This email was sent to {{ .Email }}. If you have any questions, please contact us at support@indiecraft.com
</p>
```

### 4. Update Email Subject Line

Change the subject line to:
```
Reset Your Indiecraft Password
```

### 5. Test the Configuration

1. Save the template
2. Test the forgot password flow in your application
3. Check that emails are sent from your custom email address
4. Verify the branding appears correctly

### 6. Additional Customization Options

You can also customize:
- **Confirm Email** template (for new user signups)
- **Magic Link** template (if using magic link authentication)
- **Change Email Address** template
- **Invite User** template

### Environment Variables

Make sure your `.env` file has the correct redirect URL:

```env
FRONTEND_URL=http://localhost:5173
# or for production:
FRONTEND_URL=https://yourdomain.com
```

### Troubleshooting

**Emails not sending:**
- Check SMTP credentials are correct
- Verify sender email is verified with your SMTP provider
- Check Supabase logs in Dashboard → Logs → Auth Logs

**Wrong redirect URL:**
- Update `FRONTEND_URL` in backend `.env`
- Restart backend server after changing environment variables

**Emails going to spam:**
- Set up SPF, DKIM, and DMARC records for your domain
- Use a reputable SMTP provider
- Avoid spam trigger words in email content
