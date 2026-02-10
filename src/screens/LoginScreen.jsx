import React, { useState } from 'react';
import { useDreamStore } from '../hooks/useDreamStore';
import { User, Lock, Mail, ArrowRight, Moon } from 'lucide-react';

export default function LoginScreen() {
    const { loginUser, registerUser } = useDreamStore();
    const [isLogin, setIsLogin] = useState(false); // Default to Sign Up based on image
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (isLogin) {
            const result = loginUser(email, password);
            if (!result.success) {
                setError(result.error);
            }
        } else {
            if (!name || !email || !password) {
                setError("All fields are required");
                return;
            }
            const result = registerUser(name, email, password);
            if (!result.success) {
                setError(result.error);
            }
        }
    };

    const handleSocialLogin = (provider) => {
        console.log(`Login with ${provider} not implemented`);
        // In a real app, this would trigger OAuth flow
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4 font-sans text-gray-100 selection:bg-red-500/30">
            <div className="w-full max-w-md bg-[#161b22]/40 p-8 rounded-[40px] border border-gray-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                {/* Subtle Glow Effect */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-900/10 blur-[80px] rounded-full"></div>

                {/* Header Section */}
                <div className="flex flex-col items-center mb-10 mt-2">
                    <div className="w-20 h-20 bg-[#161b22] rounded-[24px] flex items-center justify-center mb-8 border border-gray-700/50 shadow-xl group hover:border-amber-200/30 transition-all duration-500">
                        <Moon className="w-9 h-9 text-amber-100/90 fill-amber-100/10 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h1 className="text-4xl font-serif text-[#f0e6d2] mb-3 tracking-tight font-medium">
                        {isLogin ? 'Welcome Back' : 'Join DreamOff'}
                    </h1>
                    <p className="text-gray-500 text-[15px] italic font-light tracking-wide">
                        {isLogin ? 'Enter the realm of dreams' : 'Start your journey into the deep mind'}
                    </p>
                </div>

                {/* Form Section */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-red-400 transition-colors duration-300" />
                            <input
                                type="text"
                                placeholder="Your Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#0d1117]/80 border border-gray-800/80 rounded-2xl py-4.5 pl-12 pr-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-900/50 focus:ring-1 focus:ring-red-900/20 transition-all duration-300"
                            />
                        </div>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-red-400 transition-colors duration-300" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#0d1117]/80 border border-gray-800/80 rounded-2xl py-4.5 pl-12 pr-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-900/50 focus:ring-1 focus:ring-red-900/20 transition-all duration-300"
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-red-400 transition-colors duration-300" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0d1117]/80 border border-gray-800/80 rounded-2xl py-4.5 pl-12 pr-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-900/50 focus:ring-1 focus:ring-red-900/20 transition-all duration-300"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-3 animate-pulse">
                            <p className="text-red-400 text-[13px] text-center font-medium">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-[#8b0000] hover:bg-[#a00000] active:scale-[0.98] text-white rounded-2xl py-4.5 font-bold shadow-lg shadow-red-950/40 transition-all duration-300 flex items-center justify-center gap-3 group mt-8"
                    >
                        <span className="tracking-wide">{isLogin ? 'Login' : 'Create Account'}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-10 px-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-800/60"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em]">
                        <span className="bg-[#12161d] px-4 text-gray-600">Or continue with</span>
                    </div>
                </div>

                {/* Social Login Buttons */}
                <div className="space-y-4">
                    <button
                        type="button"
                        onClick={() => handleSocialLogin('Google')}
                        className="w-full bg-white hover:bg-gray-100 active:scale-[0.99] text-gray-900 rounded-[20px] py-3.5 px-6 flex items-center justify-center gap-4 font-semibold transition-all duration-300 shadow-xl shadow-black/10"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSocialLogin('Apple')}
                        className="w-full bg-[#000000] hover:bg-zinc-900 active:scale-[0.99] text-white rounded-[20px] py-3.5 px-6 flex items-center justify-center gap-4 font-semibold transition-all duration-300 shadow-xl shadow-black/20 border border-zinc-800"
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.38-1.09-.54-2.08-.51-3.2.03-1.42.66-2.58.5-3.69-.64 4.54-7.55 8.12-4.14 7.6 1.77 1.33.2 2.37-3.92 5.09-3.79.84.04 1.54.34 2.03.88-1.74 1.09-1.45 3.31.25 4.37-.58 1.45-1.5 3.35-2.73 4.58-.57.57-1.18.99-1.75 1.09-.16-.27-.33-.55-.52-.82-.54-1.07-.63-1.63 0-2.85zm-4.32-9.7c.6-1.55 2.15-2.85 4.2-2.92.21 2.03-1.68 4.24-4.2 2.92z" />
                        </svg>
                        Continue with Apple
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSocialLogin('Facebook')}
                        className="w-full bg-[#1877F2] hover:bg-[#166fe5] active:scale-[0.99] text-white rounded-[20px] py-3.5 px-6 flex items-center justify-center gap-4 font-semibold transition-all duration-300 shadow-xl shadow-[#1877F2]/20"
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        Continue with Facebook
                    </button>
                </div>

                {/* Footer Section */}
                <div className="mt-12 text-center">
                    <p className="text-gray-500 text-[14px]">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="ml-2 text-red-500 hover:text-red-400 font-bold transition-colors duration-300 underline-offset-4 hover:underline"
                        >
                            {isLogin ? 'Sign up' : 'Login'}
                        </button>
                    </p>
                    <p className="text-[10px] text-gray-700/60 mt-8 font-medium tracking-tight">
                        Local Authentication System. Credentials are secure.
                    </p>
                </div>
            </div>
        </div>
    );
}
