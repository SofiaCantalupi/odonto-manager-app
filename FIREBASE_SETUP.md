# Firebase Setup Guide

## Overview

The application now uses Firebase Realtime Database instead of localStorage for tooth selection persistence. This makes it compatible with Server-Side Rendering (SSR).

## Key Features

- ✅ **SSR Compatible** - No localStorage dependency on server
- ✅ **Real-time Synchronization** - Changes sync across devices instantly
- ✅ **Anonymous Authentication** - Users automatically authenticated anonymously
- ✅ **Fallback Support** - Graceful degradation in SSR environments
- ✅ **Type-Safe** - Full TypeScript support

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter your project name (e.g., "dental-manager")
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Realtime Database

1. In Firebase Console, go to **Build** → **Realtime Database**
2. Click **Create Database**
3. Start in **test mode** (for development)
   - Test mode rules (valid for 30 days):
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }
   ```
   > These rules allow any authenticated user to read/write. Update them based on your needs!
4. Choose a database region closest to you
5. Click **Enable**

### 3. Enable Anonymous Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Click **Anonymous**
5. Enable it and click **Save**

### 4. Get Your Firebase Credentials

1. Go to Firebase Console **Project Settings** (gear icon)
2. Click **Your apps** section
3. Register a **Web** app if you haven't
4. Copy the Firebase config object

Example config:

```javascript
{
  apiKey: "AIzaSyDn1234567890...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcd1234",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com"
}
```

### 5. Update Firebase Config Files

Update these files with your Firebase credentials:

#### File: `src/app/services/firebase.config.ts`

```typescript
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
  databaseURL: 'YOUR_DATABASE_URL', // IMPORTANT: Must include database URL
};
```

> ⚠️ **IMPORTANT**: Make sure to include the `databaseURL` field. It should look like: `https://your-project-default-rtdb.firebaseio.com`

#### File: `src/environments/firebase.environment.ts` (optional, for production)

```typescript
export const firebaseEnvironment = {
  production: false,
  firebase: {
    // ... same credentials as above
  },
};
```

## How It Works

### Architecture

1. **FirebaseService** (`src/app/services/firebase.service.ts`)
   - Manages Firebase initialization (browser-only)
   - Handles authentication (anonymous)
   - Provides data read/write/listen methods
   - Gracefully handles SSR environments

2. **OdontogramService** (`src/app/odontogram/odontogram.service.ts`)
   - Uses FirebaseService for persistence
   - Manages tooth selection state
   - Real-time synchronization via observables
   - Works in both browser and SSR

3. **Database Structure**

```
/users
  /{userId}
    /selectedTeeth: [11, 12, 13, ...] // Array of selected tooth IDs
/patients
  /{patientId}
    /personalInfo: {...}
    /insuranceInfo: {...}
    /dentalRecord: {...}
/procedures
  /{procedureId}
    /name: "Dental Cleaning"
    /category: "general"
    /basePrice: 150.00
    /description: "..."
```

### Data Flow

1. User selects a tooth in the UI
2. Component calls `selectTooth(toothId)`
3. Service updates local BehaviorSubject (instant UI feedback)
4. Service writes to Firebase Realtime Database
5. Firebase listener detects change
6. State updates automatically (syncs with other devices)

### SSR Handling

- In SSR (server-side): Firebase operations are skipped, local state is used
- In Browser: Firebase is fully functional
- Transitions smoothly when app hydrates from server to client

## Usage in Components

### Example: Odontogram Component

```typescript
// Already implemented in src/app/odontogram/odontogram.ts

// Select a tooth
selectTooth(toothId: number) {
  this.selectionService.toggleToothSelection(toothId);
}

// Clear selections
clearSelection() {
  this.selectionService.clearSelection();
}

// Check if selected
isToothSelected(toothId: number): boolean {
  return this.selectionService.isToothSelected(toothId);
}

// Get count
selectedCount = computed(() => this.selectionService.getSelectedCount());
```

## Database Security Rules

### Development (Testing)

Use these permissive rules for development. Update them before deploying to production!

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

### Production (Recommended)

Use these more restrictive rules for production:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid"
      }
    },
    "patients": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "procedures": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### How to Update Rules

1. Go to Firebase Console → **Realtime Database**
2. Click on the **Rules** tab
3. Copy and paste the appropriate rules above
4. Click **Publish**

> ⚠️ **WARNING**: The development rules are very permissive. Anyone authenticated can read/write all data. Update to production rules before deploying!

## Troubleshooting

### Issue: "Firebase: No database URL provided"

- **Solution**: Ensure `databaseURL` is set in firebase.config.ts

### Issue: "Anonymous authentication not enabled"

- **Solution**: Enable Anonymous sign-in in Firebase Console Auth settings

### Issue: "Permission denied" errors in console

- **Cause**: Firebase Realtime Database security rules are blocking access
- **Solution**:
  1. Go to Firebase Console → **Realtime Database** → **Rules** tab
  2. For **development**, use these permissive rules:
     ```json
     {
       "rules": {
         ".read": "auth != null",
         ".write": "auth != null"
       }
     }
     ```
  3. Click **Publish**
  4. Refresh your app
  5. **Before production**: Update to more restrictive rules (see "Database Security Rules" section above)

### Issue: Changes not syncing

- **Solution**:
  1. Check browser console for errors
  2. Verify Firebase is initialized (`FirebaseService.isInitialized()`)
  3. Check network tab for Firebase requests

## Testing

### Local Testing

1. Run `npm start`
2. Open DevTools Console
3. Should see: "Firebase initialized successfully"
4. Select teeth - should see in Firebase Console Realtime Database

### SSR Testing

1. Build: `npm run build`
2. Serve SSR: `npm run serve:ssr:dental-manager-app`
3. Check console - should work without errors in SSR mode

## Migration from localStorage

The app has automatically migrated from localStorage to Firebase:

- ✅ Old localStorage key `'selected_teeth'` is no longer used
- ✅ Future selections are stored in Firebase
- ✅ Data persists across devices and sessions
- ✅ Real-time synchronization enabled

## Firebase Pricing

**Free Tier (Spark Plan)** includes:

- 1 GB storage
- 100 concurrent connections
- Sufficient for development and small apps

**Realtime Database Pricing** (if you exceed free tier):

- Charged for GB stored + GB downloaded
- No charge for uploads
- ~$1-$5/month for typical usage

## Next Steps

1. ✅ Install Firebase SDK: `npm install firebase`
2. ✅ Add firebase.config.ts with your credentials
3. ✅ Test tooth selection in browser
4. ✅ Test SSR: `npm run build && npm run serve:ssr:dental-manager-app`
5. ✅ Deploy to production with updated rules

## Support

For issues:

- Check [Firebase Documentation](https://firebase.google.com/docs)
- Review console logs for error messages
- Check Firebase Console for database errors
- Verify project credentials are correct
