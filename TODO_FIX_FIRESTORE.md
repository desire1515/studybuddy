# Firestore Connection Fix - TODO

## Task: Fix Firestore offline connection and error handling

### Steps:
- [x] 1. Enable Firestore persistence in `src/firebase/config.js`
- [x] 2. Add offline error handling in `src/firebase/auth.js`
- [x] 3. Enhance AuthContext to handle network issues in `src/context/AuthContext.jsx`

### Issues Fixed:
1. "Could not reach Cloud Firestore backend" - timeout after 10 seconds ✅
2. "Failed to get document because the client is offline" ✅
3. CORS error when connecting to Firestore ✅
4. No offline support ✅

### Changes Made:
1. **config.js**: Added Firestore persistence with `enableIndexedDbPersistence` and `CACHE_SIZE_UNLIMITED`
2. **auth.js**: Added offline detection, localStorage caching, and graceful error handling for `getUserProfile`
3. **AuthContext.jsx**: Added network status monitoring, `isOnline` and `networkError` states, and try-catch handling for auth state changes

### Expected Results:
- App works offline with cached data
- Graceful error handling when network fails
- Better user experience during connection issues

