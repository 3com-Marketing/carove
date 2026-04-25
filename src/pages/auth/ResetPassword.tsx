import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import caroveLogo from '@/assets/carove-icon-white.png';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setHasSession(true);
        setChecking(false);
      }
    });

    // Also check existing session (recovery token may have been processed already)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setHasSession(true);
      }
      setChecking(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Contraseña muy corta', description: 'Mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Las contraseñas no coinciden', description: 'Verifica que ambas contraseñas sean iguales.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/auth/login', { replace: true }), 2000);
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
          <CardTitle className="text-2xl tracking-tight">Nueva contraseña</CardTitle>
          <CardDescription>Introduce tu nueva contraseña para restablecer el acceso.</CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-sm text-muted-foreground text-center">Contraseña actualizada correctamente. Redirigiendo…</p>
            </div>
          ) : !hasSession ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Enlace de recuperación no válido o expirado.</p>
              <Button variant="link" className="mt-2" onClick={() => navigate('/auth/login')}>
                Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full gradient-brand border-0 text-white hover:opacity-90" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Restablecer contraseña
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}