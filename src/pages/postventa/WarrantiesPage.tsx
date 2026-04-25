import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/constants';
import { ShieldCheck, Plus, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WarrantiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const today = new Date().toISOString().slice(0, 10);

  const { data: warranties = [], isLoading } = useQuery({
    queryKey: ['pv-warranties', statusFilter],
    queryFn: async () => {
      let q = supabase.from('pv_warranties')
        .select('*, buyers(name, last_name), vehicles(brand, model, plate)')
        .order('end_date', { ascending: true }).limit(500);
      if (statusFilter === 'active') q = q.gte('end_date', today);
      if (statusFilter === 'expired') q = q.lt('end_date', today);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: buyers = [] } = useQuery({
    queryKey: ['pv-buyers-select'],
    queryFn: async () => { const { data } = await supabase.from('buyers').select('id, name, last_name').eq('active', true).order('name').limit(500); return data || []; },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['pv-vehicles-select'],
    queryFn: async () => { const { data } = await supabase.from('vehicles').select('id, brand, model, plate').order('created_at', { ascending: false }).limit(500); return data || []; },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        vehicle_id: form.vehicle_id, buyer_id: form.buyer_id,
        warranty_type: form.warranty_type, provider: form.provider,
        start_date: form.start_date, end_date: form.end_date,
        coverage_description: form.coverage_description, exclusions: form.exclusions,
        created_by: user!.id,
      };
      if (editing?.id) {
        const { error } = await supabase.from('pv_warranties').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pv_warranties').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pv-warranties'] });
      toast({ title: editing?.id ? 'Garantía actualizada' : 'Garantía registrada' });
      setDialogOpen(false); setEditing(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => {
    setEditing({ buyer_id: '', vehicle_id: '', warranty_type: 'interna', provider: '', start_date: today, end_date: '', coverage_description: '', exclusions: '' });
    setDialogOpen(true);
  };

  const filtered = warranties.filter((w: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${w.buyers?.name} ${w.buyers?.last_name}`.toLowerCase().includes(s)
      || `${w.vehicles?.brand} ${w.vehicles?.model}`.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Garantías</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} garantías</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva garantía</Button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="expired">Caducadas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tipo</TableHead><TableHead>Proveedor</TableHead><TableHead>Cliente</TableHead>
              <TableHead>Vehículo</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead><TableHead>Estado</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin garantías</TableCell></TableRow>
              ) : filtered.map((w: any) => {
                const expired = w.end_date < today;
                return (
                  <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditing(w); setDialogOpen(true); }}>
                    <TableCell>{w.warranty_type}</TableCell>
                    <TableCell>{w.provider || '—'}</TableCell>
                    <TableCell>{w.buyers?.name} {w.buyers?.last_name || ''}</TableCell>
                    <TableCell className="text-muted-foreground">{w.vehicles?.brand} {w.vehicles?.model}</TableCell>
                    <TableCell>{formatDate(w.start_date)}</TableCell>
                    <TableCell>{formatDate(w.end_date)}</TableCell>
                    <TableCell><Badge variant={expired ? 'destructive' : 'default'} className="text-[10px]">{expired ? 'Caducada' : 'Activa'}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar garantía' : 'Nueva garantía'}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Cliente *</Label>
                  <Select value={editing.buyer_id} onValueChange={v => setEditing({ ...editing, buyer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name} {b.last_name || ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Vehículo *</Label>
                  <Select value={editing.vehicle_id} onValueChange={v => setEditing({ ...editing, vehicle_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Tipo</Label><Input value={editing.warranty_type} onChange={e => setEditing({ ...editing, warranty_type: e.target.value })} /></div>
                <div><Label>Proveedor</Label><Input value={editing.provider || ''} onChange={e => setEditing({ ...editing, provider: e.target.value })} /></div>
                <div><Label>Inicio *</Label><Input type="date" value={editing.start_date} onChange={e => setEditing({ ...editing, start_date: e.target.value })} /></div>
                <div><Label>Fin *</Label><Input type="date" value={editing.end_date} onChange={e => setEditing({ ...editing, end_date: e.target.value })} /></div>
              </div>
              <div><Label>Cobertura</Label><Textarea value={editing.coverage_description} onChange={e => setEditing({ ...editing, coverage_description: e.target.value })} rows={2} /></div>
              <div><Label>Exclusiones</Label><Textarea value={editing.exclusions} onChange={e => setEditing({ ...editing, exclusions: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!editing.buyer_id || !editing.vehicle_id || !editing.end_date || saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}{editing.id ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
