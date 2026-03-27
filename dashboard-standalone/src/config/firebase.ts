/**
 * Firebase Configuration
 *
 * Handles authentication and user data protection
 * Each user's data is isolated by their unique ID
 */

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';

// Firebase configuration - Add your config from Firebase Console
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "liv8-os.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "liv8-os",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "liv8-os.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * User profile stored in Firestore
 */
export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    locationId: string; // Links to their business location
    businessName?: string;
    phone?: string;
    tier: 'free' | 'starter' | 'growth' | 'scale' | 'enterprise';
    createdAt: any;
    updatedAt: any;
    settings: {
        theme: 'light' | 'dark' | 'system';
        timezone: string;
        notifications: boolean;
    };
}

/**
 * Create user profile in Firestore after registration
 */
export async function createUserProfile(
    user: User,
    additionalData: Partial<UserProfile> = {}
): Promise<void> {
    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        const { email, displayName, photoURL } = user;
        // Generate unique location ID for this user
        const locationId = `loc_${user.uid.slice(0, 8)}_${Date.now()}`;

        await setDoc(userRef, {
            uid: user.uid,
            email,
            displayName: displayName || additionalData.displayName || email?.split('@')[0],
            photoURL,
            locationId,
            tier: 'free',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            settings: {
                theme: 'dark',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                notifications: true
            },
            ...additionalData
        });

        // Also create their credit account on the backend
        try {
            await fetch(`${import.meta.env.VITE_API_URL || ''}/api/billing/balance?locationId=${locationId}`);
        } catch (e) {
            console.warn('Could not initialize credit account:', e);
        }
    }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
        return snapshot.data() as UserProfile;
    }
    return null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    uid: string,
    data: Partial<UserProfile>
): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
    email: string,
    password: string,
    displayName: string,
    businessName?: string
): Promise<User> {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name
    await updateProfile(user, { displayName });

    // Create Firestore profile
    await createUserProfile(user, { displayName, businessName });

    return user;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
    email: string,
    password: string
): Promise<User> {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return user;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<User> {
    const { user } = await signInWithPopup(auth, googleProvider);
    await createUserProfile(user);
    return user;
}

/**
 * Sign out
 */
export async function logOut(): Promise<void> {
    await signOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
}

/**
 * Get current user's location ID (for data isolation)
 */
export async function getCurrentLocationId(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const profile = await getUserProfile(user.uid);
    return profile?.locationId || null;
}

export { onAuthStateChanged };
export type { User };
