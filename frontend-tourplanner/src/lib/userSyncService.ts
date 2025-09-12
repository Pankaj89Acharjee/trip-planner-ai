// Service for syncing user data to PostgreSQL via Firebase Functions

interface SyncUserData {
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

interface SyncResponse {
    success: boolean;
    user?: any;
    error?: string;
}

class UserSyncService {
    private baseUrl: string;

    constructor() {
        // For local testing, use Firebase emulator
        // For production, use the deployed URL
        this.baseUrl = "https://userapi-clzbcargga-uc.a.run.app";
    }

    // Sync user to PostgreSQL (create or update)
    async syncUser(userData: SyncUserData): Promise<SyncResponse> {
        try {
            console.log('Attempting to sync user to PostgreSQL:', userData);
            console.log('Using URL:', this.baseUrl);

            const requestBody = {
                action: 'sync',
                userData: userData
            };
            console.log('Request body:', requestBody);

            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log('Sync result:', result);
            return result;
        } catch (error) {
            console.error('Error syncing user to PostgreSQL:', error);
            throw error;
        }
    }

    // Update user in PostgreSQL
    async updateUser(userData: SyncUserData): Promise<SyncResponse> {
        try {
            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'sync', // Use sync for updates too
                    userData: userData
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error updating user in PostgreSQL:', error);
            throw error;
        }
    }

    // Get user from PostgreSQL
    async getUser(uid: string): Promise<SyncResponse> {
        try {
            const response = await fetch(`${this.baseUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'get',
                    userData: { uid }
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error getting user from PostgreSQL:', error);
            throw error;
        }
    }


}

// Constant function to convert Firestore data to PostgreSQL sync format
export const firestoreDataToSyncInPostgres = (firebaseUser: any, additionalData?: any): SyncUserData => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || '', 
    preferences: additionalData?.preferences || {
      theme: 'light',
      language: 'en',
    },
    createdAt: additionalData?.createdAt,
    updatedAt: additionalData?.updatedAt,
    lastLoginAt: new Date().toISOString(),
  };
};

export const userSyncService = new UserSyncService();
export type { SyncUserData, SyncResponse };
