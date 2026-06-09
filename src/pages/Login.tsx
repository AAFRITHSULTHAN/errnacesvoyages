import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Compass, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Try initial sign in
            await signIn(email, password);
            navigate('/');
        } catch (error: any) {
            // If it's a staff member, they might have a sanitized phone number as password
            // Try signing in with digits-only version if the first one fails
            const sanitizedPassword = password.replace(/\D/g, '');
            if (sanitizedPassword && sanitizedPassword !== password) {
                try {
                    await signIn(email, sanitizedPassword);
                    navigate('/');
                    return;
                } catch (_) {
                    // Ignore second error and throw the original one or a combined one
                }
            }

            const message = error.message?.toLowerCase() || '';
            if (message.includes('confirm') || message.includes('verify')) {
                toast.error('Account not yet confirmed. Please check your email for a verification link.');
            } else {
                toast.error(error.message || 'Invalid login credentials');
            }
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/30">
            {/* Ambient Aurora / Blur Blobs */}
            <div 
                className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-red-200/30 blur-[130px] pointer-events-none animate-pulse" 
                style={{ animationDuration: '10s' }}
            />
            <div 
                className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-200/30 blur-[130px] pointer-events-none animate-pulse" 
                style={{ animationDuration: '8s' }}
            />
            <div className="absolute top-[35%] left-[65%] w-[30%] h-[30%] rounded-full bg-amber-100/20 blur-[100px] pointer-events-none" />

            {/* Login Card */}
            <div className="w-full max-w-[440px] px-6 py-4 z-10">
                <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_20px_50px_rgba(8,112,184,0.06)] rounded-[2.2rem] p-8 md:p-10 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(8,112,184,0.1)]">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-14 h-14 bg-gradient-to-tr from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/15 mb-4 transform -rotate-3 hover:rotate-0 transition-all duration-300">
                            <Compass className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5">
                            Errances Voyages CRM
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    className="pl-10 h-11 bg-white/60 border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-xl font-semibold text-slate-700 text-xs transition-all placeholder:text-slate-400 placeholder:font-medium shadow-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Password
                                </Label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    className="pl-10 pr-10 h-11 bg-white/60 border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-xl font-semibold text-slate-700 text-xs transition-all placeholder:text-slate-400 placeholder:font-medium shadow-sm"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full h-11 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/10 hover:shadow-red-500/20 transform active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5"
                        >
                            <span>Sign In</span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
