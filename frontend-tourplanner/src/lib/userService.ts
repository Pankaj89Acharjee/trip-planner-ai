import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Types for user data
export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  preferences?: {
    theme?: string;
    language?: string;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface UpdateUserData {
  displayName?: string;
  photoURL?: string;
  preferences?: {
    theme?: string;
    language?: string;
    [key: string]: any;
  };
}

class UserService {
  // Get user from Firestore
  async getUser(uid: string): Promise<UserData | null> {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // Create user in Firestore
  async createUser(userData: UserData): Promise<UserData> {
    try {
      const userDocRef = doc(db, 'users', userData.uid);
      await setDoc(userDocRef, {
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
      
      return userData;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user profile in Firestore
  async updateUserProfile(uid: string, updateData: UpdateUserData): Promise<UserData> {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        ...updateData,
        updatedAt: new Date().toISOString(),
      });
      
      // Return updated user data
      const updatedUser = await this.getUser(uid);
      return updatedUser!;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Update last login time
  async updateLastLogin(uid: string): Promise<UserData> {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      // Return updated user data
      const updatedUser = await this.getUser(uid);
      return updatedUser!;
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Sync Firebase user with Firestore
  async syncUserWithFirestore(firebaseUser: any): Promise<UserData> {
    try {
      // First, try to get the user from Firestore
      let firestoreUser = await this.getUser(firebaseUser.uid);

      if (!firestoreUser) {
        // User doesn't exist in Firestore, create them
        const userData: UserData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          preferences: {
            theme: 'light',
            language: 'en',
          },
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        firestoreUser = await this.createUser(userData);
      } else {
        // User exists, update last login
        firestoreUser = await this.updateLastLogin(firebaseUser.uid);
      }

      return firestoreUser;
    } catch (error) {
      console.error('Error syncing user with Firestore:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
