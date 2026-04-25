import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, CheckCircle2, XCircle } from 'lucide-react';

const rolLabels: Record<string, string> = {
  administrador: 'Administrador',
  vendedor: 'Vendedor',
  postventa: 'Postventa',
  contabilidad: 'Contabilidad',
};

export default function MyProfilePage() {
  const { profile } = useAuth();

  if (!profile) return null;

  const isActive = true; // profile comes from auth context, inactive users are logged out

  return (
    <div className="space-y-4 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">Información de tu cuenta</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nombre completo</p>
              <p className="text-sm font-medium">{profile.full_name || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Rol</p>
              <Badge variant="secondary" className="mt-0.5">
                {rolLabels[profile.role] || profile.role}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isActive ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <Badge variant={isActive ? 'default' : 'destructive'} className="mt-0.5">
                {isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
