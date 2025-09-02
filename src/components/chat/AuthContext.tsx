import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User,
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase.js';
import { createOrUpdateUser, subscribeToUserData, getUserData } from '../../lib/firestoreService.js';

interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
    notifications?: boolean;
  };
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  userDataLoaded: boolean;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDataLoaded, setUserDataLoaded] = useState(false);

  const handleUserAuth = async (user: User | null) => {
    if (user) {
      try {
        // Create or update user in Firestore
        const userData = await createOrUpdateUser(user);
        console.log('User data created/updated:', userData);
        
        // Get complete user profile data
        const profileData = await getUserData(user.uid);
        if (profileData) {
          setUserProfile(profileData);
        }
        
        setUserDataLoaded(true);
      } catch (error) {
        console.error('Error handling user authentication:', error);
        setUserDataLoaded(false);
        setUserProfile(null);
      }
    } else {
      setUserDataLoaded(false);
      setUserProfile(null);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleUserAuth(result.user);
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleUserAuth(result.user);
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name if provided
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }
      
      await handleUserAuth(result.user);
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) {
      throw new Error('No user logged in');
    }

    try {
      // Update Firebase Auth profile if displayName or photoURL is being updated
      if (updates.displayName || updates.photoURL) {
        await updateProfile(currentUser, {
          displayName: updates.displayName || currentUser.displayName,
          photoURL: updates.photoURL || currentUser.photoURL
        });
      }

      // Update Firestore user document
      await createOrUpdateUser({
        ...currentUser,
        displayName: updates.displayName || currentUser.displayName,
        photoURL: updates.photoURL || currentUser.photoURL
      });

      // Refresh user profile data
      await refreshUserProfile();
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    if (!currentUser) return;

    try {
      const profileData = await getUserData(currentUser.uid);
      if (profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserDataLoaded(false);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      if (user) {
        await handleUserAuth(user);
      } else {
        setUserDataLoaded(false);
        setUserProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  // Subscribe to real-time user profile updates
  useEffect(() => {
    let unsubscribeUserData: (() => void) | null = null;

    if (currentUser && userDataLoaded) {
      unsubscribeUserData = subscribeToUserData(currentUser.uid, (userData) => {
        if (userData) {
          setUserProfile(userData);
        }
      });
    }

    return () => {
      if (unsubscribeUserData) {
        unsubscribeUserData();
      }
    };
  }, [currentUser, userDataLoaded]);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    userDataLoaded,
    updateUserProfile,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};