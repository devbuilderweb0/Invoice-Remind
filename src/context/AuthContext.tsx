import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signOut as fbSignOut, FirebaseUser } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { setApiAuth } from '../lib/api';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isDemo?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (demoId?: string, demoName?: string) => void;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage for saved session (e.g. demo session)
    const savedDemoUser = localStorage.getItem('remindflow_demo_user');
    if (savedDemoUser) {
      try {
        const parsed = JSON.parse(savedDemoUser);
        setUser(parsed);
        setApiAuth(parsed.uid, parsed.uid);
      } catch {
        // ignore
      }
    }

    // Also listen to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          const appUser: AppUser = {
            uid: fbUser.uid,
            email: fbUser.email || 'user@gmail.com',
            displayName: fbUser.displayName || 'Freelancer',
            photoURL: fbUser.photoURL || undefined,
            isDemo: false,
          };
          setUser(appUser);
          setApiAuth(token, appUser.uid);
          localStorage.removeItem('remindflow_demo_user');
        } catch (e) {
          console.error('Error fetching token:', e);
        }
      } else if (!savedDemoUser) {
        // Default to demo freelancer on initial load for instant evaluation
        const initialDemo: AppUser = {
          uid: 'demo-freelancer-uid',
          email: 'alex.morgan@freelancestudio.dev',
          displayName: 'Alex Morgan',
          isDemo: true,
        };
        setUser(initialDemo);
        setApiAuth(initialDemo.uid, initialDemo.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      const appUser: AppUser = {
        uid: result.user.uid,
        email: result.user.email || 'user@gmail.com',
        displayName: result.user.displayName || 'Freelancer',
        photoURL: result.user.photoURL || undefined,
        isDemo: false,
      };
      setUser(appUser);
      setApiAuth(token, appUser.uid);
      localStorage.removeItem('remindflow_demo_user');
    } catch (err: any) {
      console.warn('Google sign-in popup notice:', err);
      const msg = err?.message || 'Google sign-in could not be completed in this environment.';
      setAuthError(msg);
      // Still allow demo sign-in seamlessly
    }
  };

  const loginAsDemo = (demoId = 'demo-freelancer-uid', demoName = 'Alex Morgan') => {
    setAuthError(null);
    const demoUser: AppUser = {
      uid: demoId,
      email: `${demoId.replace(/[^a-zA-Z0-9]/g, '')}@freelancestudio.dev`,
      displayName: demoName,
      isDemo: true,
    };
    setUser(demoUser);
    setApiAuth(demoUser.uid, demoUser.uid);
    localStorage.setItem('remindflow_demo_user', JSON.stringify(demoUser));
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    setApiAuth(null, null);
    localStorage.removeItem('remindflow_demo_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginAsDemo,
        logout,
        authError,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
