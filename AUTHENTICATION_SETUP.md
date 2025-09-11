# Firebase Authentication with Cloud SQL Integration

This document outlines the complete Firebase Authentication setup with Cloud SQL integration for the EaseMyTrip AI application.

## Overview

The authentication system provides:
- **Firebase Authentication** for user authentication
- **Cloud SQL (PostgreSQL)** for persistent user data storage
- **Firestore** for offline access and caching
- **Protected routes** for secure access to application features

## Architecture

```
Frontend (Next.js) → Firebase Auth → Cloud SQL (PostgreSQL)
                  ↓
               Firestore (Cache)
```

## Features Implemented

### 1. Authentication Methods
- ✅ Email/Password authentication
- ✅ Google OAuth authentication
- ✅ User registration and login
- ✅ Password visibility toggle
- ✅ Form validation

### 2. User Management
- ✅ User profile creation and updates
- ✅ Cloud SQL integration for persistent storage
- ✅ Firestore caching for offline access
- ✅ User preferences management

### 3. UI Components
- ✅ Login form with email/password
- ✅ Signup form with validation
- ✅ User profile dropdown in header
- ✅ Protected route wrapper
- ✅ Profile page with user information

### 4. Backend Functions
- ✅ Cloud Functions for user CRUD operations
- ✅ Cloud SQL connection management
- ✅ User synchronization between Firebase and Cloud SQL

## File Structure

```
frontend-tourplanner/src/
├── contexts/
│   └── AuthContext.tsx          # Authentication context and hooks
├── components/auth/
│   ├── LoginForm.tsx            # Login form component
│   ├── SignupForm.tsx           # Signup form component
│   └── ProtectedRoute.tsx       # Route protection wrapper
├── lib/
│   ├── firebase.ts              # Firebase configuration
│   └── userService.ts           # Cloud SQL user service
└── app/
    ├── auth/
    │   └── page.tsx             # Authentication page
    ├── profile/
    │   └── page.tsx             # User profile page
    └── layout.tsx               # Root layout with AuthProvider

firebase-backend/functions/
├── src/
│   ├── database/
│   │   └── connection.js        # Cloud SQL connection utility
│   └── services/
│       └── userService.js       # User service for Cloud SQL
└── index.js                     # Cloud Functions exports
```

## Environment Variables

Create a `.env.local` file in the `frontend-tourplanner` directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

For Cloud Functions, set these environment variables:

```env
# Cloud SQL Configuration
CLOUD_SQL_CONNECTION_NAME=your_project_id:region:instance_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

## Cloud SQL Database Schema

The system expects a `users` table with the following structure:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) UNIQUE NOT NULL,  -- Firebase UID
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    country VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en'
);
```

## Usage

### 1. Authentication Context

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, userData, loading, signIn, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.displayName}!</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <button onClick={() => signIn('email', 'password')}>Sign In</button>
      )}
    </div>
  );
}
```

### 2. Protected Routes

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function MyPage() {
  return (
    <ProtectedRoute>
      <div>This content is only visible to authenticated users</div>
    </ProtectedRoute>
  );
}
```

### 3. User Service

```tsx
import { userService } from '@/lib/userService';

// Get user data from Cloud SQL
const userData = await userService.getUser(uid);

// Update user profile
await userService.updateUserProfile(uid, {
  displayName: 'New Name',
  preferences: { theme: 'dark' }
});
```

## API Endpoints

The following Cloud Functions are available:

- `POST /createUser` - Create a new user in Cloud SQL
- `GET /getUser?uid={uid}` - Get user by UID
- `POST /updateUserProfile` - Update user profile
- `POST /updateLastLogin` - Update last login time
- `GET /searchUsers?searchTerm={term}` - Search users

## Security Features

1. **Firebase Authentication** - Secure user authentication
2. **Protected Routes** - Automatic redirection for unauthenticated users
3. **CORS Configuration** - Proper CORS setup for API calls
4. **Input Validation** - Form validation and sanitization
5. **Error Handling** - Comprehensive error handling and user feedback

## Development Setup

1. **Install Dependencies**
   ```bash
   cd frontend-tourplanner
   npm install
   
   cd ../firebase-backend/functions
   npm install
   ```

2. **Configure Firebase**
   - Set up Firebase project
   - Enable Authentication (Email/Password and Google)
   - Configure Cloud Functions
   - Set up Cloud SQL instance

3. **Set Environment Variables**
   - Copy `env.template` to `.env.local`
   - Fill in your Firebase configuration
   - Set Cloud SQL connection details

4. **Deploy Functions**
   ```bash
   cd firebase-backend
   firebase deploy --only functions
   ```

5. **Run Development Server**
   ```bash
   cd frontend-tourplanner
   npm run dev
   ```

## Testing

1. **Authentication Flow**
   - Test user registration
   - Test user login
   - Test Google OAuth
   - Test logout functionality

2. **Protected Routes**
   - Verify unauthenticated users are redirected
   - Verify authenticated users can access protected content

3. **Cloud SQL Integration**
   - Verify user data is stored in Cloud SQL
   - Test user profile updates
   - Test data synchronization

## Troubleshooting

### Common Issues

1. **Firebase Configuration**
   - Ensure all environment variables are set correctly
   - Verify Firebase project settings

2. **Cloud SQL Connection**
   - Check connection string format
   - Verify database credentials
   - Ensure Cloud SQL instance is running

3. **CORS Issues**
   - Verify CORS configuration in Cloud Functions
   - Check allowed origins

4. **Authentication Errors**
   - Check Firebase Authentication settings
   - Verify domain configuration
   - Check browser console for errors

## Next Steps

1. **Email Verification** - Add email verification flow
2. **Password Reset** - Implement password reset functionality
3. **User Roles** - Add role-based access control
4. **Profile Pictures** - Add profile picture upload
5. **Social Login** - Add more OAuth providers
6. **Two-Factor Authentication** - Add 2FA support

## Support

For issues or questions:
1. Check the Firebase documentation
2. Review Cloud SQL connection logs
3. Check browser developer tools
4. Verify environment variables
5. Test with Firebase emulators for local development
