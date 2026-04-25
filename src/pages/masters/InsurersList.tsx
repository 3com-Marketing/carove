import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsurers, createInsurer, updateInsurer, deleteInsurer } from '@/lib/supabase-api';
import type { Insurer } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Pencil, Trash2, Shield, Loader2 } from 'lucide-react';

export default function InsurersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: insurers = [], isLoading } = useQuery({ queryKey: ['insurers'], queryFn: getInsurers });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Insurer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', contact_person: '' });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updateInsurer(editing.id, { name: form.name, phone: form.phone || null, email: form.email || null, contact_person: form.contact_person || null });
      } else {
        await createInsurer({ name: form.name, phone: form.phone || null, email: form.email || null, contact_person: form.contact_person || null });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurers'] }); setDialogOpen(false); toast({ title: editing ? '✅ Aseguradora actualizada' : '✅ Aseguradora creada' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteInsurer,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurers'] }); toast({ title: 'Aseguradora eliminada' }); },
  });

  const openNew = () => { setEditing(null); setForm({ name: '', phone: '', email: '', contact_person: '' }); setDialogOpen(true); };
  const openEdit = (i: Insurer) => { setEditing(i); setForm({ name: i.name, phone: i.phone || '', email: i.email || '', contact_person: i.contact_person || '' }); setDialogOpen(true); };
  const handleSave = () => { if (!form.name) { toast({ title: 'Nombre obligatorio', variant: 'destructive' }); return; } saveMut.mutate(); };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Aseguradoras</h1><p className="text-sm text-muted-foreground">Gestión de compañías de seguros</p></div>
        <Button onClick={openNew} className="gradient-brand border-0 text-white hover:opacity-90"><PlusCircle className="h-4 w-4 mr-2" /> Nueva aseguradora</Button>
      </div>
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Teléfono</TableHead><TableHead>Email</TableHead><TableHead>Contacto</TableHead><TableHead>Estado</TableHead><TableHead className="w-24">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {insurers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground"><Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />Sin aseguradoras registradas.</TableCell></TableRow>
              ) : insurers.map(i => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-sm">{i.phone || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.email || '—'}</TableCell>
                  <TableCell className="text-sm">{i.contact_person || '—'}</TableCell>
                  <TableCell><Badge variant={i.active ? 'default' : 'secondary'}>{i.active ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMut.mutate(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? 'Editar Aseguradora' : 'Nueva Aseguradora'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Teléfono</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Persona de contacto</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={saveMut.isPending}>{editing ? 'Guardar cambios' : 'Crear'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
