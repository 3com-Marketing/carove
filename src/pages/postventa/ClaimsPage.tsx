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
import { MessageSquareWarning, Plus, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const CLAIM_TYPES = ['garantia', 'documentacion', 'comercial', 'financiacion', 'publicidad', 'atencion_cliente', 'otro'];
const STATUSES = ['abierta', 'en_revision', 'resuelta', 'rechazada'];
const typeLabels: Record<string, string> = { garantia: 'Garantía', documentacion: 'Documentación', comercial: 'Comercial', financiacion: 'Financiación', publicidad: 'Publicidad', atencion_cliente: 'Atención al cliente', otro: 'Otro' };
const statusColors: Record<string, string> = { abierta: 'bg-amber-100 text-amber-700', en_revision: 'bg-blue-100 text-blue-700', resuelta: 'bg-emerald-100 text-emerald-700', rechazada: 'bg-muted text-muted-foreground' };

export default function ClaimsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['pv-claims', statusFilter],
    queryFn: async () => {
      let q = supabase.from('pv_claims').select('*, buyers(name, last_name), vehicles(brand, model, plate)').order('opened_at', { ascending: false }).limit(500);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as any);
      const { data, error } = await q;
      if (error) throw error; return data || [];
    },
  });

  const { data: buyers = [] } = useQuery({ queryKey: ['pv-buyers-select'], queryFn: async () => { const { data } = await supabase.from('buyers').select('id, name, last_name').eq('active', true).order('name').limit(500); return data || []; } });
  const { data: vehicles = [] } = useQuery({ queryKey: ['pv-vehicles-select'], queryFn: async () => { const { data } = await supabase.from('vehicles').select('id, brand, model, plate').order('created_at', { ascending: false }).limit(500); return data || []; } });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        buyer_id: form.buyer_id, vehicle_id: form.vehicle_id,
        claim_type: form.claim_type, status: form.status,
        description: form.description, resolution: form.resolution,
        compensation_amount: parseFloat(form.compensation_amount) || 0,
        assigned_to: user!.id, assigned_to_name: profile?.full_name || '',
        created_by: user!.id,
      };
      if (editing?.id) {
        const upd: any = { ...payload };
        if (form.status === 'resuelta' && !editing.closed_at) upd.closed_at = new Date().toISOString();
        if (form.status === 'rechazada' && !editing.closed_at) upd.closed_at = new Date().toISOString();
        const { error } = await supabase.from('pv_claims').update(upd).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pv_claims').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pv-claims'] }); toast({ title: 'Reclamación guardada' }); setDialogOpen(false); setEditing(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => { setEditing({ buyer_id: '', vehicle_id: '', claim_type: 'garantia', status: 'abierta', description: '', resolution: '', compensation_amount: '' }); setDialogOpen(true); };
  const fmt = (n: any) => n ? Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—';
  const filtered = claims.filter((c: any) => { if (!search) return true; const s = search.toLowerCase(); return `${c.buyers?.name} ${c.buyers?.last_name}`.toLowerCase().includes(s) || (c.description || '').toLowerCase().includes(s); });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><MessageSquareWarning className="h-5 w-5 text-primary" /> Reclamaciones</h1><p className="text-sm text-muted-foreground">{filtered.length} reclamaciones</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva reclamación</Button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Cliente</TableHead><TableHead>Estado</TableHead><TableHead>Compensación</TableHead><TableHead>Descripción</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin reclamaciones</TableCell></TableRow>
          : filtered.map((c: any) => (
            <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditing(c); setDialogOpen(true); }}>
              <TableCell>{formatDate(c.opened_at)}</TableCell><TableCell>{typeLabels[c.claim_type] || c.claim_type}</TableCell>
              <TableCell>{c.buyers?.name} {c.buyers?.last_name || ''}</TableCell>
              <TableCell><Badge className={cn('text-[10px]', statusColors[c.status])}>{c.status}</Badge></TableCell>
              <TableCell>{fmt(c.compensation_amount)}</TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">{c.description}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></CardContent></Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar reclamación' : 'Nueva reclamación'}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Cliente *</Label><Select value={editing.buyer_id} onValueChange={v => setEditing({ ...editing, buyer_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name} {b.last_name || ''}</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2"><Label>Vehículo *</Label><Select value={editing.vehicle_id} onValueChange={v => setEditing({ ...editing, vehicle_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Tipo</Label><Select value={editing.claim_type} onValueChange={v => setEditing({ ...editing, claim_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CLAIM_TYPES.map(t => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Estado</Label><Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2"><Label>Compensación (€)</Label><Input type="number" step="0.01" value={editing.compensation_amount} onChange={e => setEditing({ ...editing, compensation_amount: e.target.value })} /></div>
              </div>
              <div><Label>Descripción *</Label><Textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} /></div>
              <div><Label>Resolución</Label><Textarea value={editing.resolution || ''} onChange={e => setEditing({ ...editing, resolution: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!editing.buyer_id || !editing.vehicle_id || saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}{editing.id ? 'Guardar' : 'Crear'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
