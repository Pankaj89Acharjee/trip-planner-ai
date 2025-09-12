'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,

} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService, UserData } from '@/lib/userService';
import { userSyncService, firestoreDataToSyncInPostgres, SyncUserData } from '@/lib/userSyncService';


interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  syncUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skipping auth in firebase if firebase is not initialized
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Try to sync user with Firestore
          const firestoreUserData = await userService.syncUserWithFirestore(user);
          console.log('Firestore user data:', firestoreUserData); 
          setUserData(firestoreUserData);

          // Sync to PostgreSQL (async, don't wait)
          const syncData = firestoreDataToSyncInPostgres(user, firestoreUserData);
          console.log('Sync data:', syncData);
          
          userSyncService.syncUser(syncData)
            .then((result) => console.log('User synced to PostgreSQL successfully:', result))
            .catch(error => console.error('Failed to sync user to PostgreSQL:', error));
        } catch (error) {
          console.warn('Firestore sync failed, using Firebase Auth data:', error);
          // Fallback: create basic user data from Firebase Auth
          const basicUserData: UserData = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            preferences: {
              theme: 'light',
              language: 'en',
            },
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setUserData(basicUserData);

          // Still try to sync to PostgreSQL even with basic data (async, don't wait)
          const syncData = firestoreDataToSyncInPostgres(user, basicUserData);
          userSyncService.syncUser(syncData)
            .then((result) => console.log('User synced to PostgreSQL successfully (fallback):', result))
            .catch(error => console.error('Failed to sync user to PostgreSQL (fallback):', error));
        }
      } else {
        setUserData(null);
      }
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  
  const signIn = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase authentication is not available');
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!auth) {
      throw new Error('Firebase authentication is not available');
    }
    
    let user: any = null;
    let userData: any = null;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;

      // Update the user's display name
      await updateProfile(user, { displayName });

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      userData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        preferences: {
          theme: 'light',
          language: 'en',
        },
      };
      await setDoc(userDocRef, userData);
      console.log("User set in the Firestore with datra", userData)
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }

    // Sync to PostgreSQL (async, don't wait) - outside try-catch to prevent signup failure
    console.log("Before Going to store data in the postgresql")
    if (user && userData) {
      console.log("Entered int the postgresql of block")
      const syncData = firestoreDataToSyncInPostgres(user, userData);
      userSyncService.syncUser(syncData)
        .then((result) => console.log('New user synced to PostgreSQL successfully:', result))
        .catch(error => console.error('Failed to sync new user to PostgreSQL:', error));
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase authentication is not available');
    }
    
    let user: any = null;
    let userData: any = null;
    let isNewUser = false;
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      user = result.user;

      // Create user document in Firestore if it doesn't exist
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        isNewUser = true;
        userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          preferences: {
            theme: 'light',
            language: 'en',
          },
        };
        await setDoc(userDocRef, userData);
      } else {
        // Update lastLoginAt for existing Google user
        await setDoc(userDocRef, {
          lastLoginAt: new Date().toISOString(),
        }, { merge: true });
        userData = { lastLoginAt: new Date().toISOString() };
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }

    // Sync to PostgreSQL (async, don't wait) - outside try-catch to prevent signup failure
    if (user && userData) {
      const syncData = firestoreDataToSyncInPostgres(user, userData);
      const logMessage = isNewUser ? 'New Google user synced to PostgreSQL successfully:' : 'Existing Google user synced to PostgreSQL successfully:';
      userSyncService.syncUser(syncData)
        .then((result) => console.log(logMessage, result))
        .catch(error => console.error(`Failed to sync ${isNewUser ? 'new' : 'existing'} Google user to PostgreSQL:`, error));
    }
  };

  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase authentication is not available');
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string }) => {
    try {
      if (user) {
        // Update Firebase Auth profile
        await updateProfile(user, data);


        try {
          if (userData) {
            // update Firestore
            const updatedUserData = await userService.updateUserProfile(user.uid, data);
            setUserData(updatedUserData);

            // Sync to PostgreSQL (async, don't wait)
            const syncData = firestoreDataToSyncInPostgres(user, updatedUserData);
            userSyncService.updateUser(syncData)
              .then((result) => console.log('User profile synced to PostgreSQL successfully:', result))
              .catch(error => console.error('Failed to sync profile update to PostgreSQL:', error));
          }
        } catch (firestoreError) {
          console.warn('Firestore update failed, updating local data only:', firestoreError);
          // Update local userData with new values
          if (userData) {
            const updatedUserData = {
              ...userData,
              ...data,
              updatedAt: new Date().toISOString(),
            };
            setUserData(updatedUserData);

            // Still try to sync to PostgreSQL (async, don't wait)
            const syncData = firestoreDataToSyncInPostgres(user, updatedUserData);
            userSyncService.updateUser(syncData)
              .then((result) => console.log('User profile synced to PostgreSQL successfully (fallback):', result))
              .catch(error => console.error('Failed to sync profile update to PostgreSQL (fallback):', error));
          }
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const syncUserData = async () => {
    try {
      if (user) {
        try {
          //syncing with Firestore
          const firestoreUserData = await userService.syncUserWithFirestore(user);
          setUserData(firestoreUserData);
        } catch (firestoreError) {
          console.warn('Firestore sync failed, using Firebase Auth data:', firestoreError);
          // Fallback to Firebase Auth data
          const basicUserData: UserData = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            preferences: {
              theme: 'light',
              language: 'en',
            },
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          setUserData(basicUserData);
        }
      }
    } catch (error) {
      console.error('Error syncing user data:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    updateUserProfile,
    syncUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
