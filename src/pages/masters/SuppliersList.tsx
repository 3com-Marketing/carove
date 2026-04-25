import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierRepairStats } from '@/lib/supabase-api';
import type { Supplier } from '@/lib/types';
import { formatCurrency } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, Building2, Loader2, Wrench } from 'lucide-react';

export default function SuppliersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', specialty: '' });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updateSupplier(editing.id, { name: form.name, phone: form.phone, email: form.email || null, address: form.address || null, specialty: form.specialty || null });
      } else {
        await createSupplier({ name: form.name, phone: form.phone, email: form.email || null, address: form.address || null, specialty: form.specialty || null });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setDialogOpen(false); toast({ title: editing ? '✅ Proveedor actualizado' : '✅ Proveedor creado' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); toast({ title: 'Proveedor eliminado' }); },
  });

  const openNew = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', specialty: '' }); setDialogOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, phone: s.phone, email: s.email || '', address: s.address || '', specialty: s.specialty || '' }); setDialogOpen(true); };

  const handleSave = () => { if (!form.name) { toast({ title: 'Nombre obligatorio', variant: 'destructive' }); return; } saveMut.mutate(); };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Talleres / Acreedores</h1><p className="text-sm text-muted-foreground">Gestión de proveedores de servicios</p></div>
        <Button onClick={openNew} className="gradient-brand border-0 text-white hover:opacity-90"><PlusCircle className="h-4 w-4 mr-2" /> Nuevo proveedor</Button>
      </div>
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Teléfono</TableHead><TableHead>Email</TableHead><TableHead>Especialidad</TableHead><TableHead>Reparaciones</TableHead><TableHead>Estado</TableHead><TableHead className="w-24">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
               {suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />Sin proveedores registrados.</TableCell></TableRow>
              ) : suppliers.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {s.name}
                      {s.is_internal && <Badge variant="outline" className="text-[9px] px-1.5 py-0">🏠 Interno</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.email || '—'}</TableCell>
                  <TableCell className="text-sm">{s.specialty || '—'}</TableCell>
                  <TableCell><SupplierStats supplierId={s.id} /></TableCell>
                  <TableCell><Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMut.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Dirección</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>Especialidad</Label><Input value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={saveMut.isPending}>{editing ? 'Guardar cambios' : 'Crear'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SupplierStats({ supplierId }: { supplierId: string }) {
  const { data } = useQuery({
    queryKey: ['supplier-repair-stats', supplierId],
    queryFn: () => getSupplierRepairStats(supplierId),
    staleTime: 60000,
  });

  if (!data || data.totalOrders === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Wrench className="h-3 w-3 text-muted-foreground" />
      <span>{data.totalOrders}</span>
      <span className="text-muted-foreground">·</span>
      <span>{formatCurrency(data.totalInvoiced)}</span>
    </div>
  );
}
