import { useState, FormEvent } from 'react';
import { useDreamStore } from '../hooks/useDreamStore';
import { User, Lock, Mail, ArrowRight, Moon } from 'lucide-react';

const INPUT_CLASS =
    'w-full bg-authSurfaceDeep/80 border border-gray-800/80 rounded-2xl py-4 pl-12 pr-4 text-gray-200 placeholder-muted focus:outline-none focus:border-border/50 focus:ring-1 focus:ring-border/20 transition-all duration-300';

export default function LoginScreen() {
    const { loginUser, registerUser } = useDreamStore();
    const [isLogin, setIsLogin] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLogin) {
                const result = await loginUser(email, password);
                if (!result.success) setError(result.error ?? 'Login failed.');
            } else {
                if (!name || !email || !password) { setError('All fields are required'); setIsLoading(false); return; }
                const result = await registerUser(name, email, password);
                if (!result.success) setError(result.error ?? 'Registration failed.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-authSurfaceDeep px-4 font-sans text-gray-100 selection:bg-accent/30">
            <div className="w-full max-w-md bg-authSurface/40 p-8 rounded-[40px] border border-gray-800/50 backdrop-blur-xl shadow-2xl relative overflow-hidden">

                {/* Ambient glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 blur-[80px] rounded-full pointer-events-none" />

                {/* ── Header ── */}
                <div className="flex flex-col items-center mb-10 mt-2">
                    <div className="w-20 h-20 bg-authSurface rounded-[24px] flex items-center justify-center mb-8 border border-gray-700/50 shadow-xl group hover:border-amber-200/30 transition-all duration-500">
                        <Moon className="w-9 h-9 text-amber-100/90 fill-amber-100/10 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h1 className="text-4xl font-serif text-primary mb-3 tracking-tight font-medium">
                        {isLogin ? 'Welcome Back' : 'Join DreamOff'}
                    </h1>
                    <p className="text-muted text-[15px] italic font-light tracking-wide">
                        {isLogin ? 'Enter the realm of dreams' : 'Begin your journey into the deep mind'}
                    </p>
                </div>

                {/* ── Form ── */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors duration-300" />
                            <input type="text" placeholder="Your Name" value={name}
                                aria-label="Your name" autoComplete="name"
                                onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
                        </div>
                    )}

                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors duration-300" />
                        <input type="email" placeholder="Email Address" value={email}
                            aria-label="Email address" autoComplete="email"
                            onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-accent transition-colors duration-300" />
                        <input type="password" placeholder="Password" value={password}
                            aria-label="Password"
                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                            onChange={(e) => setPassword(e.target.value)} className={INPUT_CLASS} />
                    </div>

                    {error && (
                        <div role="alert" className="bg-danger/10 border border-danger/30 rounded-xl p-3">
                            <p className="text-danger text-sm text-center font-medium">{error}</p>
                        </div>
                    )}

                    <button type="submit" disabled={isLoading}
                        className="w-full bg-actionPrimary hover:bg-actionHover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl py-4 font-bold shadow-lg shadow-actionPrimary/40 transition-all duration-300 flex items-center justify-center gap-3 group mt-6">
                        <span className="tracking-wide">
                            {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
                        </span>
                        {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />}
                    </button>
                </form>

                {/* ── Footer ── */}
                <div className="mt-10 text-center">
                    <p className="text-muted text-sm">
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="ml-2 text-accent hover:text-primary font-semibold transition-colors duration-300 hover:underline underline-offset-4">
                            {isLogin ? 'Sign up' : 'Login'}
                        </button>
                    </p>
                    <p className="text-[10px] text-muted mt-6 tracking-tight">
                        Your dreams are sent to an AI service to be interpreted.{' '}
                        <a href="/privacy" className="text-accent/80 hover:text-accent underline underline-offset-2">
                            How your data is handled
                        </a>
                    </p>
                </div>

            </div>
        </div>
    );
}
