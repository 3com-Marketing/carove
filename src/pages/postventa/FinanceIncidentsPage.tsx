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
import { Landmark, Plus, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUSES = ['abierta', 'en_gestion', 'resuelta', 'cerrada'];
const statusColors: Record<string, string> = { abierta: 'bg-amber-100 text-amber-700', en_gestion: 'bg-blue-100 text-blue-700', resuelta: 'bg-emerald-100 text-emerald-700', cerrada: 'bg-muted text-muted-foreground' };

export default function FinanceIncidentsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['pv-finance-incidents', statusFilter],
    queryFn: async () => {
      let q = supabase.from('pv_finance_incidents').select('*, buyers(name, last_name), vehicles(brand, model, plate)').order('created_at', { ascending: false }).limit(500);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as any);
      const { data, error } = await q; if (error) throw error; return data || [];
    },
  });

  const { data: buyers = [] } = useQuery({ queryKey: ['pv-buyers-select'], queryFn: async () => { const { data } = await supabase.from('buyers').select('id, name, last_name').eq('active', true).order('name').limit(500); return data || []; } });
  const { data: vehicles = [] } = useQuery({ queryKey: ['pv-vehicles-select'], queryFn: async () => { const { data } = await supabase.from('vehicles').select('id, brand, model, plate').order('created_at', { ascending: false }).limit(500); return data || []; } });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = { buyer_id: form.buyer_id, vehicle_id: form.vehicle_id, finance_entity_name: form.finance_entity_name, problem_type: form.problem_type, description: form.description, status: form.status, resolution: form.resolution, internal_notes: form.internal_notes, assigned_to: user!.id, assigned_to_name: profile?.full_name || '', created_by: user!.id };
      if (editing?.id) { const { error } = await supabase.from('pv_finance_incidents').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('pv_finance_incidents').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pv-finance-incidents'] }); toast({ title: 'Guardado' }); setDialogOpen(false); setEditing(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => { setEditing({ buyer_id: '', vehicle_id: '', finance_entity_name: '', problem_type: '', description: '', status: 'abierta', resolution: '', internal_notes: '' }); setDialogOpen(true); };
  const filtered = items.filter((i: any) => { if (!search) return true; const s = search.toLowerCase(); return `${i.buyers?.name} ${i.buyers?.last_name}`.toLowerCase().includes(s) || (i.description || '').toLowerCase().includes(s); });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Incidencias de Financiación</h1><p className="text-sm text-muted-foreground">{filtered.length} incidencias</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva</Button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Entidad</TableHead><TableHead>Problema</TableHead><TableHead>Cliente</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin incidencias</TableCell></TableRow>
          : filtered.map((i: any) => (
            <TableRow key={i.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditing(i); setDialogOpen(true); }}>
              <TableCell>{formatDate(i.created_at)}</TableCell><TableCell>{i.finance_entity_name}</TableCell>
              <TableCell className="max-w-[200px] truncate">{i.problem_type}</TableCell>
              <TableCell>{i.buyers?.name} {i.buyers?.last_name || ''}</TableCell>
              <TableCell><Badge className={cn('text-[10px]', statusColors[i.status])}>{i.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody></Table></CardContent></Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar' : 'Nueva incidencia de financiación'}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Cliente *</Label><Select value={editing.buyer_id} onValueChange={v => setEditing({ ...editing, buyer_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name} {b.last_name || ''}</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2"><Label>Vehículo *</Label><Select value={editing.vehicle_id} onValueChange={v => setEditing({ ...editing, vehicle_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Entidad financiera *</Label><Input value={editing.finance_entity_name} onChange={e => setEditing({ ...editing, finance_entity_name: e.target.value })} /></div>
                <div><Label>Tipo de problema *</Label><Input value={editing.problem_type} onChange={e => setEditing({ ...editing, problem_type: e.target.value })} /></div>
                <div className="col-span-2"><Label>Estado</Label><Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label>Descripción *</Label><Textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} /></div>
              <div><Label>Resolución</Label><Textarea value={editing.resolution || ''} onChange={e => setEditing({ ...editing, resolution: e.target.value })} rows={2} /></div>
              <div><Label>Notas internas</Label><Textarea value={editing.internal_notes || ''} onChange={e => setEditing({ ...editing, internal_notes: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!editing.buyer_id || !editing.vehicle_id || !editing.finance_entity_name || saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}{editing.id ? 'Guardar' : 'Crear'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
