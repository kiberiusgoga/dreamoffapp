import React, { useState } from 'react';
import { Moon, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useDreamStore } from '../hooks/useDreamStore';

export default function LoginScreen({ onLogin }) {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { loginUser, registerUser } = useDreamStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate network delay for "Real" feel
        setTimeout(() => {
            let result;
            if (mode === 'login') {
                result = loginUser(formData.email, formData.password);
            } else {
                if (!formData.name) {
                    setError("Name is required");
                    setIsLoading(false);
                    return;
                }
                result = registerUser(formData.name, formData.email, formData.password);
            }

            if (result.success) {
                onLogin(); // Notify App to switch screen
            } else {
                setError(result.error);
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surface to-background transition-colors duration-700">

            {/* Main Login Card */}
            <div className="w-full max-w-md bg-surface/40 backdrop-blur-xl border border-border/40 rounded-[30px] p-8 sm:p-12 shadow-glow flex flex-col items-center text-center relative overflow-hidden animate-fade-in">

                {/* Top Glow Accent */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gold blur-[4px] opacity-70"></div>

                {/* Logo Container */}
                <div className="w-16 h-16 rounded-2xl border border-border/30 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(212,175,55,0.1)] bg-background/50">
                    <Moon className="w-8 h-8 text-gold drop-shadow-md fill-gold/20" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-serif text-primary mb-1 tracking-wide drop-shadow-md">
                    {mode === 'login' ? 'Welcome Back' : 'Join DreamOff'}
                </h1>

                {/* Subtitle */}
                <p className="text-gray-400 font-serif text-sm italic mb-8 opacity-80">
                    {mode === 'login' ? 'Enter the Royal Road to the Unconscious' : 'Start your journey into the deep mind'}
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="w-full space-y-4">

                    {/* Name (Register Only) */}
                    {mode === 'register' && (
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-gold transition-colors" />
                            <input
                                type="text"
                                placeholder="Your Name"
                                className="w-full bg-surfaceLight/30 border border-border/30 rounded-xl py-3 pl-12 pr-4 text-primary focus:border-gold focus:outline-none focus:bg-surfaceLight/50 transition-all font-sans"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-gold transition-colors" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-surfaceLight/30 border border-border/30 rounded-xl py-3 pl-12 pr-4 text-primary focus:border-gold focus:outline-none focus:bg-surfaceLight/50 transition-all font-sans"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-gold transition-colors" />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full bg-surfaceLight/30 border border-border/30 rounded-xl py-3 pl-12 pr-4 text-primary focus:border-gold focus:outline-none focus:bg-surfaceLight/50 transition-all font-sans"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="text-red-400 text-xs font-bold animate-pulse">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-actionPrimary hover:bg-actionHover text-primary font-bold tracking-wide shadow-[0_0_20px_rgba(128,0,0,0.3)] hover:shadow-[0_0_30px_rgba(128,0,0,0.5)] transition-all duration-300 flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed border border-border/20"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {mode === 'login' ? 'Sign In' : 'Create Account'}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Mode Toggle */}
                <div className="mt-6 text-sm text-gray-400">
                    {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => {
                            setMode(mode === 'login' ? 'register' : 'login');
                            setError('');
                            setFormData({ name: '', email: '', password: '' });
                        }}
                        className="text-actionPrimary hover:text-actionHover hover:underline font-bold"
                    >
                        {mode === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                </div>

                {/* Footer Disclaimer */}
                <p className="mt-8 text-[10px] text-gray-600 font-sans max-w-xs leading-relaxed opacity-50">
                    Local Authentication System. Credentials are stored securely on your device.
                </p>

            </div>
        </div>
    );
}
