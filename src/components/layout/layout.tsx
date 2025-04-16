import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { Search, User, LogIn, Home, Menu, X, ChevronDown, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

// Dynamically import the PWA prompt component with SSR disabled
const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), {
    ssr: false,
});

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
    showHistory?: boolean;
    showNewSearch?: boolean;
}

export default function Layout({
                                   children,
                                   title,
                                   showNewSearch = false
                               }: LayoutProps) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Use auth store instead of local state
    const {
        isLoggedIn,
        isAdminLoggedIn,
        userData,
        checkAuthStatus,
        logout
    } = useAuthStore();

    // Check auth status when component mounts or route changes
    useEffect(() => {
        setMounted(true);
        checkAuthStatus();
    }, [router.pathname, checkAuthStatus]);

    // Toggle mobile menu
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    // Close mobile menu on navigation
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [router.pathname]);

    // Handle logout
    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-sm">
                <div className="container mx-auto py-3 px-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <Link href="/" className="flex items-center space-x-2">
                                <div className="w-10 h-10 bg-amber-500 text-white flex items-center justify-center font-bold rounded-md">
                                    PNG
                                </div>
                                <span className="font-bold text-lg hidden sm:inline dark:text-white">PNG Pess Book</span>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-6">
                            <Link href="/" className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                                <Home size={18} />
                                <span>Home</span>
                            </Link>

                            <Link href="/match" className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                                <Search size={18} />
                                <span>Face Match</span>
                            </Link>

                            {isAdminLoggedIn && (
                                <Link href="/admin" className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                                    <ShieldAlert size={18} />
                                    <span>Admin Panel</span>
                                </Link>
                            )}

                            {/* Add direct profile link for all logged in users */}
                            {(isLoggedIn || isAdminLoggedIn) && (
                                <Link href="/profile" className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                                    <User size={18} />
                                    <span>My Profile</span>
                                </Link>
                            )}

                            {(isLoggedIn || isAdminLoggedIn) ? (
                                <div className="relative group">
                                    <button className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                                        <User size={18} />
                                        <span>
                                            {userData?.firstName || (isAdminLoggedIn ? 'Admin' : 'Account')}
                                        </span>
                                        <ChevronDown size={16} />
                                    </button>

                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg overflow-hidden z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                                        <div className="py-1">
                                            {isLoggedIn && !isAdminLoggedIn && (
                                                <Link href="/profile" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700">
                                                    My Profile
                                                </Link>
                                            )}
                                            <button
                                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={handleLogout}
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-3">
                                    <Link href="/login" className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
                                        <LogIn size={18} />
                                        <span>Login</span>
                                    </Link>
                                </div>
                            )}

                            {showNewSearch && (
                                <Button size="sm" onClick={() => router.push('/')}>
                                    New Search
                                </Button>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <button className="md:hidden" onClick={toggleMobileMenu}>
                            {isMobileMenuOpen ? (
                                <X size={24} className="text-slate-700 dark:text-slate-300" />
                            ) : (
                                <Menu size={24} className="text-slate-700 dark:text-slate-300" />
                            )}
                        </button>
                    </div>

                    {/* Mobile Navigation */}
                    {isMobileMenuOpen && (
                        <div className="md:hidden mt-4 pb-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col space-y-3 pt-4">
                                <Link href="/" className="flex items-center gap-2 py-2 text-slate-700 dark:text-slate-300">
                                    <Home size={18} />
                                    <span>Home</span>
                                </Link>

                                <Link href="/match" className="flex items-center gap-2 py-2 text-slate-700 dark:text-slate-300">
                                    <Search size={18} />
                                    <span>Face Match</span>
                                </Link>

                                {isAdminLoggedIn && (
                                    <Link href="/admin" className="flex items-center gap-2 py-2 text-slate-700 dark:text-slate-300">
                                        <ShieldAlert size={18} />
                                        <span>Admin Panel</span>
                                    </Link>
                                )}

                                {(isLoggedIn || isAdminLoggedIn) ? (
                                    <>
                                        {/* Always show profile link regardless of user type */}
                                        <Link href="/profile" className="flex items-center gap-2 py-2 text-slate-700 dark:text-slate-300">
                                            <User size={18} />
                                            <span>My Profile</span>
                                        </Link>
                                        <button
                                            className="flex items-center gap-2 py-2 text-red-600"
                                            onClick={handleLogout}
                                        >
                                            <LogIn size={18} />
                                            <span>Logout</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/login" className="flex items-center gap-2 py-2 text-slate-700 dark:text-slate-300">
                                            <LogIn size={18} />
                                            <span>Login</span>
                                        </Link>
                                    </>
                                )}

                                {showNewSearch && (
                                    <Button size="sm" onClick={() => router.push('/')}>
                                        New Search
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <main className="container mx-auto py-6 px-4 flex-grow">
                {title && (
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-center">{title}</h1>
                    </div>
                )}
                {children}
            </main>

            <footer className="bg-slate-50 dark:bg-slate-800 py-6 border-t border-slate-200 dark:border-slate-700 mt-auto">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Community Based Project © {new Date().getFullYear()} PNG PESS BOOK Limited
                    </p>
                </div>
            </footer>

            {/* Only show PWA install prompt on client side */}
            {mounted && <PWAInstallPrompt />}
        </div>
    );
}