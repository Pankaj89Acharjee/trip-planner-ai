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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Try to sync user with Firestore
          const firestoreUserData = await userService.syncUserWithFirestore(user);
          setUserData(firestoreUserData);
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
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update the user's display name
      await updateProfile(user, { displayName });
      
      // Create user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
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
      });
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create user document in Firestore if it doesn't exist
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
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
        });
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
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
        
        // Try to update Firestore
        try {
          if (userData) {
            const updatedUserData = await userService.updateUserProfile(user.uid, data);
            setUserData(updatedUserData);
          }
        } catch (firestoreError) {
          console.warn('Firestore update failed, updating local data only:', firestoreError);
          // Update local userData with new values
          if (userData) {
            setUserData({
              ...userData,
              ...data,
              updatedAt: new Date().toISOString(),
            });
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
