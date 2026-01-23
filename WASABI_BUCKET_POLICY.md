# Wasabi Bucket Policy Configuration

## Problem
Images are uploaded to Wasabi successfully, but the public URLs don't work because the bucket doesn't allow public read access.

## Solution: Set Bucket Policy

### Step 1: Log in to Wasabi Console

1. Go to https://console.wasabisys.com
2. Log in with your credentials

### Step 2: Navigate to Your Bucket

1. Click on **Buckets** in the left sidebar
2. Find and click on your bucket: **ic-catalogue**

### Step 3: Set Bucket Policy

1. Click on the **Policies** tab
2. Click **Edit Bucket Policy** or **Add Policy**
3. Paste this policy (replace `ic-catalogue` if your bucket name is different):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ic-catalogue/*"
    }
  ]
}
```

4. Click **Save**

### What This Policy Does

- **Effect: Allow** - Allows the action
- **Principal: "*"** - Applies to everyone (public access)
- **Action: s3:GetObject** - Allows reading/downloading objects
- **Resource: arn:aws:s3:::ic-catalogue/*** - Applies to all files in the bucket

### Step 4: Verify CORS (Optional but Recommended)

While in the bucket settings, also configure CORS:

1. Go to **CORS Configuration** tab
2. Add this configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

This allows browsers to load images from your domain.

### Step 5: Test Direct Access

After setting the policy, test a direct Wasabi URL in your browser:

```
https://s3.ap-southeast-1.wasabisys.com/ic-catalogue/designs/ind005/mustard/1768909698530.webp
```

If it loads, the bucket policy is correct!

### Step 6: Test CDN Access

Then test via your CDN:

```
https://cdn.indiecraft.in/ic-catalogue/designs/ind005/mustard/1768909698530.webp
```

## Alternative: Use Signed URLs for Public Access

If you don't want to make the bucket public, you can modify the code to use signed URLs for public access too. However, this has drawbacks:

**Drawbacks of Signed URLs:**
- URLs expire (need to regenerate)
- More complex to manage
- Can't use CDN caching effectively
- URLs are very long

**For a catalogue application, public bucket access is the standard approach.**

## Security Note

Making the bucket public only allows **reading** files. Users cannot:
- Upload files
- Delete files
- List bucket contents
- Modify files

Only the images themselves are accessible via direct URL.

## Troubleshooting

### Policy Not Working

If images still don't load after setting the policy:

1. **Wait 1-2 minutes** - Policy changes take time to propagate
2. **Clear browser cache** - Old 403 errors might be cached
3. **Check bucket name** - Ensure the ARN matches your bucket name exactly
4. **Verify region** - Ensure you're using the correct regional endpoint

### 403 Forbidden Error

This means the bucket policy is not set or incorrect:
- Double-check the policy JSON syntax
- Ensure the bucket name in the ARN is correct
- Make sure you saved the policy

### 404 Not Found Error

This means the file doesn't exist:
- Verify the file was uploaded successfully in Wasabi console
- Check the file path matches the URL
- Ensure the bucket name is correct

## Current Status

Your URLs are being generated correctly:
```
https://cdn.indiecraft.in/ic-catalogue/designs/ind005/mustard/1768909698530.webp
```

Once you set the bucket policy, these URLs will work immediately.
