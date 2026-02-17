# Troubleshooting Username Login Issue

## Problem
Getting "Invalid username or password" error when trying to login with username instead of email.

## Root Causes & Solutions

### 1. Database Migration Not Run

**Check if migration was run:**
```sql
-- In Supabase SQL Editor, run:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('username', 'email');
```

**Expected Result:**
You should see both `username` and `email` columns.

**If columns don't exist, run:**
```sql
-- Run USERNAME_MIGRATION.sql in Supabase SQL Editor
-- (The file is in the backend folder)
```

---

### 2. Username Column Exists But Has No Data

**Check if users have usernames:**
```sql
SELECT id, full_name, email, username 
FROM user_profiles 
LIMIT 10;
```

**Expected Result:**
All users should have both `email` and `username` populated.

**If username is NULL for existing users, run:**
```sql
-- Run FIX_EXISTING_USERS.sql in Supabase SQL Editor
-- (The file is in the backend folder)
```

---

### 3. Backend Server Not Restarted

After making code changes to `auth.js`, you need to restart the backend server.

**Restart the server:**
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
# or
node src/index.js
```

---

### 4. Verify Username Lookup is Working

**Test the username lookup manually:**
```sql
-- Replace 'test_username' with an actual username from your database
SELECT email 
FROM user_profiles 
WHERE username = 'test_username';
```

**Expected Result:**
Should return the email address for that username.

---

## Step-by-Step Fix

### Step 1: Run Database Migrations
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run `USERNAME_MIGRATION.sql`
4. Run `FIX_EXISTING_USERS.sql`

### Step 2: Verify Data
```sql
-- Check all users have username and email
SELECT 
  COUNT(*) as total_users,
  COUNT(username) as users_with_username,
  COUNT(email) as users_with_email
FROM user_profiles;
```

All three counts should be equal.

### Step 3: Restart Backend
```bash
# In backend directory
npm run dev
```

### Step 4: Test Login
1. Try logging in with username
2. If still fails, check backend logs for errors
3. Check browser console for error messages

---

## Debugging Tips

### Check Backend Logs
Look for these log messages when attempting login:
- "error while login >>>" - Shows Supabase auth errors
- Any database query errors

### Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try logging in
4. Look for error messages

### Test with Email First
1. Try logging in with email address
2. If email works but username doesn't, the issue is in username lookup
3. If email also fails, the issue is with authentication itself

---

## Common Issues

### Issue: "Username already exists" when creating new user
**Solution:** Username must be unique. Choose a different username.

### Issue: Username lookup returns NULL
**Solution:** 
1. Check if username column exists
2. Check if user's username is populated
3. Run FIX_EXISTING_USERS.sql

### Issue: Login works with email but not username
**Solution:**
1. Verify username exists in database
2. Check username is spelled correctly (case-sensitive)
3. Ensure backend server was restarted after code changes

---

## Quick Verification Script

Run this in Supabase SQL Editor to check everything:

```sql
-- 1. Check if columns exist
SELECT 'Columns Check' as test, 
       COUNT(*) as result 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('username', 'email');
-- Expected: 2

-- 2. Check if data is populated
SELECT 'Data Check' as test,
       COUNT(*) as total,
       COUNT(username) as with_username,
       COUNT(email) as with_email
FROM user_profiles;
-- Expected: All three numbers should be equal

-- 3. Check for duplicate usernames
SELECT 'Duplicate Check' as test,
       username,
       COUNT(*) as count
FROM user_profiles
WHERE username IS NOT NULL
GROUP BY username
HAVING COUNT(*) > 1;
-- Expected: No results (no duplicates)

-- 4. Sample user data
SELECT 'Sample Data' as test,
       id, full_name, username, email
FROM user_profiles
LIMIT 5;
-- Expected: All fields populated
```

---

## Still Not Working?

If you've completed all steps above and it's still not working:

1. **Check the exact error message** in backend logs
2. **Verify the username** you're trying to login with actually exists:
   ```sql
   SELECT * FROM user_profiles WHERE username = 'your_username_here';
   ```
3. **Check if email is populated** for that user
4. **Try creating a brand new user** and test login with that username
5. **Check browser network tab** to see the actual request/response

---

## Contact Support

If none of the above works, provide:
- Backend server logs
- Browser console errors
- Result of the Quick Verification Script above
- The username you're trying to login with
