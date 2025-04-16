import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Role enum to match Prisma schema
export enum Role {
    USER = 'USER',
    ADMIN = 'ADMIN',
    SUPER_ADMIN = 'SUPER_ADMIN'
}

// Interface for User data matching Prisma schema
export interface UserData {
    id: string;
    email: string;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    profileImageUrl?: string | null;
    faceId?: string | null;
    residentialPath?: string | null;
    isEmailVerified?: boolean;
    role: Role;
    createdAt?: string;
    updatedAt?: string;

    // Additional fields from schema that might be useful
    occupation?: string | null;
    religion?: string | null;
    denomination?: string | null;
    clan?: string | null;
}

// Interface for Admin data matching Prisma schema
export interface AdminData {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: Role;
    createdAt?: string;
    updatedAt?: string;
}

// Define the auth store interface
interface AuthState {
    // State
    isLoggedIn: boolean;
    isAdminLoggedIn: boolean;
    userData: UserData | null;
    adminData: AdminData | null;
    isLoading: boolean;

    // Actions
    setUser: (userData: UserData | null) => void;
    setAdmin: (adminData: AdminData | null) => void;
    setLoggedIn: (status: boolean) => void;
    setAdminLoggedIn: (status: boolean) => void;
    logout: () => Promise<void>;
    setLoading: (status: boolean) => void;

    // Auth check
    checkAuthStatus: () => Promise<void>;
}

// Create the store with persist middleware to keep authentication state
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            isLoggedIn: false,
            isAdminLoggedIn: false,
            userData: null,
            adminData: null,
            isLoading: false,

            // Actions
            setUser: (userData) => set({ userData }),
            setAdmin: (adminData) => set({ adminData }),
            setLoggedIn: (status) => set({ isLoggedIn: status }),
            setAdminLoggedIn: (status) => set({ isAdminLoggedIn: status }),
            setLoading: (status) => set({ isLoading: status }),

            logout: async () => {
                try {
                    const response = await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (response.ok) {
                        // Reset auth state
                        set({
                            isLoggedIn: false,
                            isAdminLoggedIn: false,
                            userData: null,
                            adminData: null
                        });
                    } else {
                        console.error('Logout failed');
                    }
                } catch (error) {
                    console.error('Error during logout:', error);
                }
            },

            // Check authentication status with the server
            checkAuthStatus: async () => {
                const {
                    setLoading,
                    setLoggedIn,
                    setAdminLoggedIn,
                    setUser,
                    setAdmin
                } = get();

                try {
                    setLoading(true);

                    // First try admin authentication
                    try {
                        const adminResponse = await fetch('/api/auth/admin/check');
                        if (adminResponse.ok) {
                            const adminData = await adminResponse.json();
                            console.log('Admin authenticated:', adminData);

                            // Set admin state
                            setAdminLoggedIn(true);
                            setLoggedIn(false);
                            setAdmin({
                                id: adminData.adminId,
                                email: adminData.email || '',
                                role: adminData.role as Role || Role.ADMIN
                            });
                            setUser(null); // Clear any user data

                            setLoading(false);
                            return;
                        }
                    } catch (adminError) {
                        console.error('Admin auth error:', adminError);
                        // Continue to try user auth
                    }

                    // Then try user authentication
                    try {
                        const userResponse = await fetch('/api/auth/profile');
                        if (userResponse.ok) {
                            const data = await userResponse.json();
                            console.log('User authenticated:', data.user);

                            // Format dates properly if they exist
                            const userData = data.user;
                            if (userData.dateOfBirth) {
                                // Ensure dateOfBirth is in ISO format if it exists
                                userData.dateOfBirth = new Date(userData.dateOfBirth).toISOString();
                            }

                            // Set user state
                            setLoggedIn(true);
                            setAdminLoggedIn(false);
                            setUser({
                                ...userData,
                                role: userData.role || Role.USER
                            });
                            setAdmin(null); // Clear any admin data

                            setLoading(false);
                            return;
                        }
                    } catch (userError) {
                        console.error('User auth error:', userError);
                    }

                    // If we get here, neither user nor admin is logged in
                    console.log('No authenticated user found');
                    setLoggedIn(false);
                    setAdminLoggedIn(false);
                    setUser(null);
                    setAdmin(null);
                } catch (error) {
                    console.error('Error checking auth status:', error);
                    setLoggedIn(false);
                    setAdminLoggedIn(false);
                    setUser(null);
                    setAdmin(null);
                } finally {
                    setLoading(false);
                }
            },
        }),
        {
            name: 'auth-storage', // unique name for localStorage
            // Only persist these fields, not methods
            partialize: (state) => ({
                isLoggedIn: state.isLoggedIn,
                isAdminLoggedIn: state.isAdminLoggedIn,
                userData: state.userData,
                adminData: state.adminData
            }),
        }
    )
);