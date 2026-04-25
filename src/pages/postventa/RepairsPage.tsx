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
import { Wrench, Plus, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUSES = ['pendiente', 'en_curso', 'esperando_piezas', 'finalizada', 'cancelada'];
const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente', en_curso: 'En curso', esperando_piezas: 'Esperando piezas',
  finalizada: 'Finalizada', cancelada: 'Cancelada',
};

export default function RepairsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: repairs = [], isLoading } = useQuery({
    queryKey: ['pv-repairs', statusFilter],
    queryFn: async () => {
      let q = supabase.from('pv_repairs')
        .select('*, buyers(name, last_name), vehicles(brand, model, plate), suppliers(name)')
        .order('created_at', { ascending: false }).limit(500);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: buyers = [] } = useQuery({ queryKey: ['pv-buyers-select'], queryFn: async () => { const { data } = await supabase.from('buyers').select('id, name, last_name').eq('active', true).order('name').limit(500); return data || []; } });
  const { data: vehicles = [] } = useQuery({ queryKey: ['pv-vehicles-select'], queryFn: async () => { const { data } = await supabase.from('vehicles').select('id, brand, model, plate').order('created_at', { ascending: false }).limit(500); return data || []; } });
  const { data: suppliers = [] } = useQuery({ queryKey: ['pv-suppliers-select'], queryFn: async () => { const { data } = await supabase.from('suppliers').select('id, name').eq('active', true).order('name'); return data || []; } });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        vehicle_id: form.vehicle_id, buyer_id: form.buyer_id,
        supplier_id: form.supplier_id || null, diagnosis: form.diagnosis,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        final_cost: parseFloat(form.final_cost) || 0,
        cost_company: parseFloat(form.cost_company) || 0,
        cost_warranty: parseFloat(form.cost_warranty) || 0,
        cost_client: parseFloat(form.cost_client) || 0,
        entry_date: form.entry_date || null, exit_date: form.exit_date || null,
        status: form.status, observations: form.observations,
        created_by: user!.id,
      };
      if (editing?.id) {
        const { error } = await supabase.from('pv_repairs').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pv_repairs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pv-repairs'] });
      toast({ title: editing?.id ? 'Reparación actualizada' : 'Reparación creada' });
      setDialogOpen(false); setEditing(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => {
    setEditing({ buyer_id: '', vehicle_id: '', supplier_id: '', diagnosis: '', estimated_cost: '', final_cost: '', cost_company: '', cost_warranty: '', cost_client: '', entry_date: '', exit_date: '', status: 'pendiente', observations: '' });
    setDialogOpen(true);
  };

  const fmt = (n: any) => n ? Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—';
  const filtered = repairs.filter((r: any) => { if (!search) return true; const s = search.toLowerCase(); return `${r.buyers?.name} ${r.buyers?.last_name}`.toLowerCase().includes(s) || `${r.vehicles?.brand} ${r.vehicles?.model}`.toLowerCase().includes(s); });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> Reparaciones Postventa</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} reparaciones</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva reparación</Button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Fecha entrada</TableHead><TableHead>Cliente</TableHead><TableHead>Vehículo</TableHead>
              <TableHead>Taller</TableHead><TableHead>Estado</TableHead><TableHead>Coste est.</TableHead><TableHead>Coste final</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin reparaciones</TableCell></TableRow>
              : filtered.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                  <TableCell>{r.entry_date ? formatDate(r.entry_date) : '—'}</TableCell>
                  <TableCell>{r.buyers?.name} {r.buyers?.last_name || ''}</TableCell>
                  <TableCell className="text-muted-foreground">{r.vehicles?.brand} {r.vehicles?.model}</TableCell>
                  <TableCell>{r.suppliers?.name || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{statusLabels[r.status]}</Badge></TableCell>
                  <TableCell>{fmt(r.estimated_cost)}</TableCell>
                  <TableCell>{fmt(r.final_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar reparación' : 'Nueva reparación'}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Cliente *</Label>
                  <Select value={editing.buyer_id} onValueChange={v => setEditing({ ...editing, buyer_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name} {b.last_name || ''}</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2"><Label>Vehículo *</Label>
                  <Select value={editing.vehicle_id} onValueChange={v => setEditing({ ...editing, vehicle_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2"><Label>Taller</Label>
                  <Select value={editing.supplier_id || ''} onValueChange={v => setEditing({ ...editing, supplier_id: v })}><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger><SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Estado</Label><Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Entrada</Label><Input type="date" value={editing.entry_date || ''} onChange={e => setEditing({ ...editing, entry_date: e.target.value })} /></div>
                <div><Label>Salida</Label><Input type="date" value={editing.exit_date || ''} onChange={e => setEditing({ ...editing, exit_date: e.target.value })} /></div>
                <div><Label>Coste estimado</Label><Input type="number" step="0.01" value={editing.estimated_cost} onChange={e => setEditing({ ...editing, estimated_cost: e.target.value })} /></div>
                <div><Label>Coste final</Label><Input type="number" step="0.01" value={editing.final_cost} onChange={e => setEditing({ ...editing, final_cost: e.target.value })} /></div>
                <div><Label>Empresa</Label><Input type="number" step="0.01" value={editing.cost_company} onChange={e => setEditing({ ...editing, cost_company: e.target.value })} /></div>
                <div><Label>Garantía</Label><Input type="number" step="0.01" value={editing.cost_warranty} onChange={e => setEditing({ ...editing, cost_warranty: e.target.value })} /></div>
                <div><Label>Cliente</Label><Input type="number" step="0.01" value={editing.cost_client} onChange={e => setEditing({ ...editing, cost_client: e.target.value })} /></div>
              </div>
              <div><Label>Diagnóstico</Label><Textarea value={editing.diagnosis} onChange={e => setEditing({ ...editing, diagnosis: e.target.value })} rows={2} /></div>
              <div><Label>Observaciones</Label><Textarea value={editing.observations} onChange={e => setEditing({ ...editing, observations: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!editing.buyer_id || !editing.vehicle_id || saveMutation.isPending}>
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
