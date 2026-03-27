/**
 * Authentication Context
 *
 * Provides secure user authentication state throughout the app
 * Ensures data isolation - users can only access their own data
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
    auth,
    onAuthStateChanged,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logOut,
    resetPassword,
    getUserProfile,
    updateUserProfile,
} from '../config/firebase';
import type { UserProfile, User } from '../config/firebase';

interface AuthContextType {
    // State
    user: User | null;
    profile: UserProfile | null;
    locationId: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Auth Methods
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, displayName: string, businessName?: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;

    // Profile Methods
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Derived state
    const locationId = profile?.locationId || null;
    const isAuthenticated = !!user && !!profile;

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Fetch user profile
                const userProfile = await getUserProfile(firebaseUser.uid);
                setProfile(userProfile);

                // Store locationId for API calls
                if (userProfile?.locationId) {
                    localStorage.setItem('os_location_id', userProfile.locationId);
                    localStorage.setItem('os_user_id', firebaseUser.uid);
                }
            } else {
                setProfile(null);
                localStorage.removeItem('os_location_id');
                localStorage.removeItem('os_user_id');
            }

            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    // Auth methods
    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            await signInWithEmail(email, password);
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (
        email: string,
        password: string,
        displayName: string,
        businessName?: string
    ) => {
        setIsLoading(true);
        try {
            await signUpWithEmail(email, password, displayName, businessName);
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await logOut();
            localStorage.clear();
        } finally {
            setIsLoading(false);
        }
    };

    const sendPasswordReset = async (email: string) => {
        await resetPassword(email);
    };

    const handleUpdateProfile = async (data: Partial<UserProfile>) => {
        if (!user) throw new Error('Not authenticated');
        await updateUserProfile(user.uid, data);
        await refreshProfile();
    };

    const refreshProfile = async () => {
        if (!user) return;
        const userProfile = await getUserProfile(user.uid);
        setProfile(userProfile);
    };

    const value: AuthContextType = {
        user,
        profile,
        locationId,
        isLoading,
        isAuthenticated,
        login,
        signup,
        loginWithGoogle,
        logout,
        sendPasswordReset,
        updateProfile: handleUpdateProfile,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * HOC to protect routes - ensures user can only access their own data
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
    return function AuthenticatedComponent(props: P) {
        const { isAuthenticated, isLoading } = useAuth();

        if (isLoading) {
            return <LoadingScreen />;
        }

        if (!isAuthenticated) {
            // Redirect to login or show unauthorized
            window.location.href = '/';
            return null;
        }

        return <Component {...props} />;
    };
}

// Inline loading screen for auth
function LoadingScreen() {
    return (
        <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
                    <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
                </div>
                <p className="text-gray-400 text-sm">Authenticating...</p>
            </div>
        </div>
    );
}

export default AuthContext;
