import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/constants';
import { ClipboardCheck, Plus, Loader2, Search } from 'lucide-react';

const REVIEW_TYPES = ['revision_cortesia', 'cambio_aceite', 'revision_general', 'comprobacion_entrega', 'fidelizacion'];
const typeLabels: Record<string, string> = { revision_cortesia: 'Revisión cortesía', cambio_aceite: 'Cambio aceite', revision_general: 'Revisión general', comprobacion_entrega: 'Comprobación entrega', fidelizacion: 'Fidelización' };

export default function ReviewsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['pv-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pv_reviews').select('*, buyers(name, last_name), vehicles(brand, model, plate)').order('review_date', { ascending: false }).limit(500);
      if (error) throw error; return data || [];
    },
  });

  const { data: buyers = [] } = useQuery({ queryKey: ['pv-buyers-select'], queryFn: async () => { const { data } = await supabase.from('buyers').select('id, name, last_name').eq('active', true).order('name').limit(500); return data || []; } });
  const { data: vehicles = [] } = useQuery({ queryKey: ['pv-vehicles-select'], queryFn: async () => { const { data } = await supabase.from('vehicles').select('id, brand, model, plate').order('created_at', { ascending: false }).limit(500); return data || []; } });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = { vehicle_id: form.vehicle_id, buyer_id: form.buyer_id, review_type: form.review_type, review_date: form.review_date, cost: parseFloat(form.cost) || 0, company_assumed: form.company_assumed, notes: form.notes, assigned_to: user!.id, assigned_to_name: profile?.full_name || '', created_by: user!.id };
      if (editing?.id) { const { error } = await supabase.from('pv_reviews').update(payload).eq('id', editing.id); if (error) throw error; }
      else { const { error } = await supabase.from('pv_reviews').insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pv-reviews'] }); toast({ title: 'Revisión guardada' }); setDialogOpen(false); setEditing(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => { setEditing({ buyer_id: '', vehicle_id: '', review_type: 'revision_cortesia', review_date: new Date().toISOString().slice(0, 10), cost: '', company_assumed: true, notes: '' }); setDialogOpen(true); };
  const fmt = (n: any) => n ? Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—';
  const filtered = reviews.filter((r: any) => { if (!search) return true; const s = search.toLowerCase(); return `${r.buyers?.name} ${r.buyers?.last_name}`.toLowerCase().includes(s) || `${r.vehicles?.brand} ${r.vehicles?.model}`.toLowerCase().includes(s); });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Revisiones y Mantenimientos</h1><p className="text-sm text-muted-foreground">{filtered.length} registros</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva revisión</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
      {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Cliente</TableHead><TableHead>Vehículo</TableHead><TableHead>Coste</TableHead><TableHead>Asume empresa</TableHead></TableRow></TableHeader><TableBody>
          {filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin revisiones</TableCell></TableRow>
          : filtered.map((r: any) => (
            <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditing(r); setDialogOpen(true); }}>
              <TableCell>{formatDate(r.review_date)}</TableCell><TableCell>{typeLabels[r.review_type] || r.review_type}</TableCell>
              <TableCell>{r.buyers?.name} {r.buyers?.last_name || ''}</TableCell><TableCell className="text-muted-foreground">{r.vehicles?.brand} {r.vehicles?.model}</TableCell>
              <TableCell>{fmt(r.cost)}</TableCell><TableCell>{r.company_assumed ? 'Sí' : 'No'}</TableCell>
            </TableRow>
          ))}
        </TableBody></Table></CardContent></Card>
      )}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar revisión' : 'Nueva revisión'}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Cliente *</Label><Select value={editing.buyer_id} onValueChange={v => setEditing({ ...editing, buyer_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name} {b.last_name || ''}</SelectItem>)}</SelectContent></Select></div>
                <div className="col-span-2"><Label>Vehículo *</Label><Select value={editing.vehicle_id} onValueChange={v => setEditing({ ...editing, vehicle_id: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Tipo</Label><Select value={editing.review_type} onValueChange={v => setEditing({ ...editing, review_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REVIEW_TYPES.map(t => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Fecha *</Label><Input type="date" value={editing.review_date} onChange={e => setEditing({ ...editing, review_date: e.target.value })} /></div>
                <div><Label>Coste</Label><Input type="number" step="0.01" value={editing.cost} onChange={e => setEditing({ ...editing, cost: e.target.value })} /></div>
                <div className="flex items-center gap-2 pt-6"><Checkbox checked={editing.company_assumed} onCheckedChange={v => setEditing({ ...editing, company_assumed: v })} /><Label>Asume empresa</Label></div>
              </div>
              <div><Label>Notas</Label><Textarea value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={2} /></div>
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
