import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { updateProfileBranch } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, UserPlus, ShieldAlert } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import { z } from 'zod';

const VALID_ROLES: UserRole[] = ['vendedor', 'postventa', 'administrador', 'contabilidad'];

const inviteSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255),
  full_name: z.string().trim().min(1, 'Nombre obligatorio').max(100),
  role: z.enum(['vendedor', 'postventa', 'administrador', 'contabilidad']),
});

interface UserRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  branch: string | null;
  created_at: string;
}

async function fetchUsersWithRoles(): Promise<UserRow[]> {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').order('full_name');
  if (pErr) throw pErr;
  const { data: roles, error: rErr } = await supabase.from('user_roles').select('*');
  if (rErr) throw rErr;
  return (profiles || []).map(p => ({
    id: p.id,
    user_id: p.user_id,
    email: p.email,
    full_name: p.full_name,
    role: (roles?.find(r => r.user_id === p.user_id)?.role || 'vendedor') as UserRole,
    active: p.active,
    branch: (p as any).branch || null,
    created_at: p.created_at,
  }));
}

export default function UsersList() {
  const { user } = useAuth();
  const { data: branches = [] } = useBranches();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'vendedor' as UserRole });
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsersWithRoles });

  // Change role mutation
  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Rol actualizado correctamente' });
    },
    onError: (err: any) => {
      toast({ title: 'Error al cambiar rol', description: err.message, variant: 'destructive' });
    },
  });

  // Toggle active mutation
  const toggleActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ active })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Estado actualizado' });
    },
    onError: (err: any) => {
      toast({ title: 'Error al cambiar estado', description: err.message, variant: 'destructive' });
    },
  });

  // Change branch mutation
  const changeBranch = useMutation({
    mutationFn: async ({ userId, branch }: { userId: string; branch: string | null }) => {
      await updateProfileBranch(userId, branch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Sucursal actualizada' });
    },
    onError: (err: any) => {
      toast({ title: 'Error al cambiar sucursal', description: err.message, variant: 'destructive' });
    },
  });
  const inviteUser = useMutation({
    mutationFn: async (data: z.infer<typeof inviteSchema>) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No autenticado');

      const res = await supabase.functions.invoke('invite-user', {
        body: data,
      });

      if (res.error) throw new Error(res.error.message || 'Error al invitar usuario');
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Invitación enviada correctamente' });
      setInviteOpen(false);
      setInviteForm({ email: '', full_name: '', role: 'vendedor' });
      setInviteErrors({});
    },
    onError: (err: any) => {
      toast({ title: 'Error al invitar', description: err.message, variant: 'destructive' });
    },
  });

  const handleInvite = () => {
    const result = inviteSchema.safeParse(inviteForm);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      setInviteErrors(errs);
      return;
    }
    setInviteErrors({});
    inviteUser.mutate(result.data);
  };

  const handleRoleChange = (u: UserRow, newRole: UserRole) => {
    if (u.user_id === user?.id) {
      toast({ title: 'No puedes cambiar tu propio rol', variant: 'destructive' });
      return;
    }
    changeRole.mutate({ userId: u.user_id, newRole });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground">Administra usuarios, roles y accesos del sistema</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Invitar Usuario
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />Sin usuarios.
                  </TableCell>
                </TableRow>
              ) : users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(val) => handleRoleChange(u, val as UserRole)}
                      disabled={u.user_id === user?.id || changeRole.isPending}
                    >
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_ROLES.map(r => (
                          <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'default' : 'secondary'}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('es-ES')}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.branch || '_none'}
                      onValueChange={(val) => changeBranch.mutate({ userId: u.user_id, branch: val === '_none' ? null : val })}
                      disabled={changeBranch.isPending}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sin asignar</SelectItem>
                        {branches.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {u.user_id !== user?.id && (
                      <Button
                        variant={u.active ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => toggleActive.mutate({ userId: u.user_id, active: !u.active })}
                        disabled={toggleActive.isPending}
                      >
                        {u.active ? 'Desactivar' : 'Activar'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar Usuario</DialogTitle>
            <DialogDescription>Se enviará un email de invitación para que el usuario defina su contraseña.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inv-email">Email</Label>
              <Input
                id="inv-email"
                type="email"
                value={inviteForm.email}
                onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                placeholder="usuario@ejemplo.com"
              />
              {inviteErrors.email && <p className="text-xs text-destructive mt-1">{inviteErrors.email}</p>}
            </div>
            <div>
              <Label htmlFor="inv-name">Nombre completo</Label>
              <Input
                id="inv-name"
                value={inviteForm.full_name}
                onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Nombre Apellidos"
              />
              {inviteErrors.full_name && <p className="text-xs text-destructive mt-1">{inviteErrors.full_name}</p>}
            </div>
            <div>
              <Label htmlFor="inv-role">Rol</Label>
              <Select value={inviteForm.role} onValueChange={val => setInviteForm(f => ({ ...f, role: val as UserRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALID_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inviteErrors.role && <p className="text-xs text-destructive mt-1">{inviteErrors.role}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteUser.isPending}>
              {inviteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar Invitación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
