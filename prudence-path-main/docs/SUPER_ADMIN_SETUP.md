# Super Admin User Setup

## Creating the Super Admin User

### Step 1: Create User via Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" or "Invite User"
3. Enter:
   - **Email**: `agboola378@gmail.com`
   - **Password**: `Smart@1,2,3`
   - **Auto Confirm User**: ✅ Yes (check this box)
4. Click "Create User" or "Send Invitation"

### Step 2: Get User ID
1. After creating the user, find them in the users list
2. Copy their User ID (UUID)

### Step 3: Promote to Super Admin
Run this SQL in the Supabase SQL Editor:

```sql
-- Replace 'USER_ID_HERE' with the actual user ID from Step 2
SELECT public.promote_to_super_admin('USER_ID_HERE');
```

Or manually run:

```sql
-- Update profile
UPDATE public.profiles
SET approval_status = 'approved'
WHERE user_id = 'USER_ID_HERE';

-- Add super_admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 4: Verify
Check that the user has:
- ✅ `approval_status = 'approved'` in `profiles` table
- ✅ `role = 'super_admin'` in `user_roles` table

---

## Email Templates Setup

Email templates are configured in the Supabase Dashboard, not in code.

### To Configure Email Templates:

1. Go to **Supabase Dashboard → Authentication → Email Templates**

2. Configure the following templates:

   **a. Confirm Signup**
   - Subject: `Confirm your PRUDENCE PATH account`
   - Body: Customize with PRUDENCE PATH branding
   - Include: Confirmation link

   **b. Magic Link**
   - Subject: `Sign in to PRUDENCE PATH`
   - Body: Customize with PRUDENCE PATH branding
   - Include: Magic link

   **c. Change Email Address**
   - Subject: `Confirm your new email for PRUDENCE PATH`
   - Body: Customize with PRUDENCE PATH branding
   - Include: Confirmation link

   **d. Reset Password**
   - Subject: `Reset your PRUDENCE PATH password`
   - Body: Customize with PRUDENCE PATH branding
   - Include: Reset link

   **e. Invite User**
   - Subject: `You've been invited to PRUDENCE PATH`
   - Body: Customize with PRUDENCE PATH branding
   - Include: Invitation link

### Template Variables Available:
- `{{ .ConfirmationURL }}` - Confirmation/reset link
- `{{ .Email }}` - User's email
- `{{ .Token }}` - Token (if needed)
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL

### Recommended Template Structure:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PRUDENCE PATH</title>
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h1 style="color: #4F46E5;">PRUDENCE PATH</h1>
    <p>Hello,</p>
    <p>{{ .EmailContent }}</p>
    <a href="{{ .ConfirmationURL }}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
      {{ .ButtonText }}
    </a>
    <p style="margin-top: 30px; color: #666; font-size: 12px;">
      If you didn't request this, please ignore this email.
    </p>
  </div>
</body>
</html>
```

---

## Notes

- Email templates use Go template syntax
- You can customize colors, fonts, and branding
- Test emails can be sent from the Supabase dashboard
- SMTP settings can be configured in Authentication → Settings

---

**Last Updated**: January 2, 2026

