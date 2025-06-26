# Super Admin Setup Guide

This guide explains how to create a super admin user for the multi-tenant landscaping management system.

## 🚀 Quick Setup

### Option 1: Default Super Admin (Recommended for Development)

Run the following command to create a super admin with default credentials:

```bash
npm run create-superadmin
```

**Default Credentials:**
- **Email:** superadmin@landscaping.com
- **Password:** SuperAdmin@2024!

### Option 2: Custom Super Admin (Recommended for Production)

1. **Set Environment Variables**

   Add these to your `.env` file:

   ```env
   SUPER_ADMIN_EMAIL=your-email@example.com
   SUPER_ADMIN_PASSWORD=your-secure-password
   SUPER_ADMIN_NAME=Your Name (optional)
   SUPER_ADMIN_PHONE=+1-555-000-0000 (optional)
   ```

2. **Run the Custom Script**

   ```bash
   npm run create-custom-superadmin
   ```

### Option 3: Reset Super Admin (If Login Issues)

If you're having login issues or need to reset the super admin:

```bash
npm run reset-superadmin
```

This will:
- Delete existing super admin
- Create a new one with verified email
- Provide fresh credentials

## 🔍 Check Super Admin Status

To check the current super admin status:

```bash
npm run check-superadmin
```

This will show:
- Email and user details
- Email verification status
- Creation date
- User ID

## 🔐 Security Best Practices

### Password Requirements
- Use a strong password (minimum 12 characters)
- Include uppercase, lowercase, numbers, and special characters
- Avoid common words or patterns

### Example Strong Passwords:
- `MySecurePass@2024!`
- `LandscapingAdmin#2024`
- `SuperAdmin$Secure123`

### After Creation
1. **Change Password:** Change the password immediately after first login
2. **Enable 2FA:** If two-factor authentication is available, enable it
3. **Secure Access:** Use HTTPS and secure connections
4. **Regular Updates:** Update credentials regularly

## 🎯 Super Admin Capabilities

The super admin has access to:

- **Tenant Management:** Create, edit, and manage all tenants
- **System Settings:** Configure global system settings
- **User Management:** Manage all users across all tenants
- **Analytics:** View system-wide analytics and reports
- **Billing:** Manage billing and subscriptions
- **Activity Logs:** View all system activity logs

## 🛠️ Troubleshooting

### Login Issues

If you're getting "Invalid credentials" errors:

1. **Check Email Verification:**
   ```bash
   npm run check-superadmin
   ```
   Ensure `Email Verified: true`

2. **Reset Super Admin:**
   ```bash
   npm run reset-superadmin
   ```

3. **Verify Credentials:**
   - Use exact email: `superadmin@landscaping.com`
   - Use exact password: `SuperAdmin@2024!`
   - Check for typos and case sensitivity

### Database Connection Issues
Make sure your MongoDB connection string is correct in the `.env` file:

```env
MONGO_URI=mongodb://localhost:27017/your-database-name
```

### Permission Issues
Ensure you have write permissions to the database and the application can create users.

## 📧 Login Instructions

1. Start your backend server: `npm run dev`
2. Navigate to your frontend application
3. Go to the login page
4. Use the super admin credentials created above
5. You'll be redirected to the super admin dashboard

## 🔄 Available Commands

| Command | Description |
|---------|-------------|
| `npm run create-superadmin` | Create default super admin |
| `npm run create-custom-superadmin` | Create super admin with custom credentials |
| `npm run reset-superadmin` | Reset super admin (delete and recreate) |
| `npm run check-superadmin` | Check current super admin status |

## 📞 Support

If you encounter any issues:
1. Check the console output for error messages
2. Verify your database connection
3. Ensure all environment variables are set correctly
4. Check the server logs for additional details
5. Run `npm run check-superadmin` to verify status

---

**⚠️ Important:** Keep your super admin credentials secure and never share them publicly! 