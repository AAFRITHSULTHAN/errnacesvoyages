import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Lock, Mail } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signIn(email, password);
            navigate('/');
        } catch (error: any) {
            toast.error(error.message || 'Error signing in');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Card className="w-full max-w-md shadow-lg border-slate-100">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Welcome Back</CardTitle>
                    <CardDescription>Sign in to your ERRANCES VOYAGES CRM account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                            Sign In
                        </Button>
                    </form>

                </CardContent>
            </Card>
        </div>
    );
}
