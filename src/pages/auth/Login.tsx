import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import caroveLogo from '@/assets/carove-icon-white.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);
    if (error) {
      toast({ title: 'Error de acceso', description: error, variant: 'destructive' });
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: 'Nombre obligatorio', description: 'Introduce tu nombre completo.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signup(email, password, fullName);
    setLoading(false);
    if (error) {
      toast({ title: 'Error al registrarse', description: error, variant: 'destructive' });
    } else {
      toast({ title: '✅ Cuenta creada', description: 'Revisa tu email para confirmar la cuenta.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="absolute inset-0 bg-primary overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-white/5" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-white/3" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 animate-fade-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <img src={caroveLogo} alt="Carove" className="h-16 w-16 mx-auto" />
          </div>
          <CardTitle className="text-2xl tracking-tight">Carove Gestión</CardTitle>
          <CardDescription>Accede o crea una cuenta para gestionar tu stock.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="login" className="flex-1">Acceder</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full gradient-brand border-0 text-white hover:opacity-90" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Acceder
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-muted-foreground"
                  disabled={forgotLoading}
                  onClick={async () => {
                    if (!email.trim()) {
                      toast({ title: 'Introduce tu email', description: 'Escribe tu email para recuperar la contraseña.', variant: 'destructive' });
                      return;
                    }
                    setForgotLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    setForgotLoading(false);
                    if (error) {
                      toast({ title: 'Error', description: error.message, variant: 'destructive' });
                    } else {
                      toast({ title: '📧 Email enviado', description: 'Revisa tu bandeja de entrada para restablecer la contraseña.' });
                    }
                  }}
                >
                  {forgotLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  ¿Olvidaste tu contraseña?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nombre completo</Label>
                  <Input id="signup-name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Carlos Rodríguez" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full gradient-brand border-0 text-white hover:opacity-90" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Crear cuenta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
