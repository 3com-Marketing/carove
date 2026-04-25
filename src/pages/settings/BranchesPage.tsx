import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Building2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BranchForm {
  name: string;
  address: string;
  phone: string;
}

const emptyForm: BranchForm = { name: '', address: '', phone: '' };

export default function BranchesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (b: any) => {
    setEditingId(b.id);
    setForm({ name: b.name, address: b.address || '', phone: b.phone || '' });
    setDialogOpen(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['branches-all'] });
    queryClient.invalidateQueries({ queryKey: ['branches-active'] });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from('branches').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Sucursal actualizada' });
      } else {
        const { error } = await supabase.from('branches').insert(payload);
        if (error) throw error;
        toast({ title: 'Sucursal creada' });
      }
      invalidate();
      setDialogOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleToggle = async (b: any) => {
    try {
      const { error } = await supabase.from('branches').update({ active: !b.active }).eq('id', b.id);
      if (error) throw error;
      toast({ title: b.active ? 'Sucursal desactivada' : 'Sucursal activada' });
      invalidate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const set = (key: keyof BranchForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" /> Sucursales
          </h1>
          <p className="text-sm text-muted-foreground">Gestión de centros y sucursales</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nueva sucursal
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="text-muted-foreground">{b.address || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{b.phone || '—'}</TableCell>
                <TableCell>
                  <Badge variant={b.active ? 'default' : 'destructive'}>
                    {b.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(b)}>
                      {b.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Sucursal' : 'Nueva Sucursal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nombre de la sucursal" />
            </div>
            <div className="space-y-1.5">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Dirección" />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Teléfono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editingId ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
