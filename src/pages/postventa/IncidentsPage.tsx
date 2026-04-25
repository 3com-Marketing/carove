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
import { AlertTriangle, Plus, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const INCIDENT_TYPES = ['averia', 'ruido', 'fallo_electronico', 'problema_documental', 'problema_comercial', 'incidencia_entrega', 'mantenimiento', 'otro'];
const SEVERITIES = ['leve', 'media', 'alta', 'urgente'];
const STATUSES = ['abierta', 'en_revision', 'diagnosticando', 'en_reparacion', 'pendiente_cliente', 'cerrada'];

const typeLabels: Record<string, string> = {
  averia: 'Avería', ruido: 'Ruido', fallo_electronico: 'Fallo electrónico',
  problema_documental: 'Problema documental', problema_comercial: 'Problema comercial',
  incidencia_entrega: 'Incidencia de entrega', mantenimiento: 'Mantenimiento', otro: 'Otro',
};

const severityColors: Record<string, string> = {
  leve: 'bg-emerald-100 text-emerald-700', media: 'bg-amber-100 text-amber-700',
  alta: 'bg-orange-100 text-orange-700', urgente: 'bg-destructive/10 text-destructive',
};

const statusLabels: Record<string, string> = {
  abierta: 'Abierta', en_revision: 'En revisión', diagnosticando: 'Diagnosticando',
  en_reparacion: 'En reparación', pendiente_cliente: 'Pendiente cliente', cerrada: 'Cerrada',
};

export default function IncidentsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['pv-incidents', statusFilter, severityFilter],
    queryFn: async () => {
      let q = supabase.from('pv_incidents')
        .select('*, buyers(name, last_name), vehicles(brand, model, plate)')
        .order('opened_at', { ascending: false }).limit(500);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as any);
      if (severityFilter !== 'all') q = q.eq('severity', severityFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: buyers = [] } = useQuery({
    queryKey: ['pv-buyers-select'],
    queryFn: async () => {
      const { data } = await supabase.from('buyers').select('id, name, last_name').eq('active', true).order('name').limit(500);
      return data || [];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['pv-vehicles-select'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicles').select('id, brand, model, plate').order('created_at', { ascending: false }).limit(500);
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (form: any) => {
      const payload = {
        buyer_id: form.buyer_id,
        vehicle_id: form.vehicle_id,
        sale_id: form.sale_id || null,
        warranty_id: form.warranty_id || null,
        incident_type: form.incident_type,
        severity: form.severity,
        status: form.status,
        description: form.description,
        assigned_to: user!.id,
        assigned_to_name: profile?.full_name || '',
        internal_notes: form.internal_notes,
        warranty_covered: form.warranty_covered === 'true' ? true : form.warranty_covered === 'false' ? false : null,
        created_by: user!.id,
      };
      if (editing?.id) {
        const upd: any = { ...payload };
        if (form.status === 'cerrada' && !editing.closed_at) upd.closed_at = new Date().toISOString();
        const { error } = await supabase.from('pv_incidents').update(upd).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pv_incidents').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pv-incidents'] });
      toast({ title: editing?.id ? 'Incidencia actualizada' : 'Incidencia creada' });
      setDialogOpen(false); setEditing(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => {
    setEditing({
      buyer_id: '', vehicle_id: '', incident_type: 'averia', severity: 'media',
      status: 'abierta', description: '', internal_notes: '', warranty_covered: '',
    });
    setDialogOpen(true);
  };

  const filtered = incidents.filter((i: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${i.buyers?.name} ${i.buyers?.last_name}`.toLowerCase().includes(s)
      || `${i.vehicles?.brand} ${i.vehicles?.model} ${i.vehicles?.plate}`.toLowerCase().includes(s)
      || (i.description || '').toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" /> Incidencias
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} incidencias</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva incidencia</Button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estados</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda gravedad</SelectItem>
            {SEVERITIES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Gravedad</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin incidencias</TableCell></TableRow>
              ) : filtered.map((i: any) => (
                <TableRow key={i.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditing(i); setDialogOpen(true); }}>
                  <TableCell>{formatDate(i.opened_at)}</TableCell>
                  <TableCell>{typeLabels[i.incident_type] || i.incident_type}</TableCell>
                  <TableCell><Badge className={cn('text-[10px]', severityColors[i.severity])}>{i.severity}</Badge></TableCell>
                  <TableCell>{i.buyers?.name} {i.buyers?.last_name || ''}</TableCell>
                  <TableCell className="text-muted-foreground">{i.vehicles?.brand} {i.vehicles?.model}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{statusLabels[i.status]}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{i.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar incidencia' : 'Nueva incidencia'}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Cliente *</Label>
                  <Select value={editing.buyer_id} onValueChange={v => setEditing({ ...editing, buyer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name} {b.last_name || ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Vehículo *</Label>
                  <Select value={editing.vehicle_id} onValueChange={v => setEditing({ ...editing, vehicle_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={editing.incident_type} onValueChange={v => setEditing({ ...editing, incident_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Gravedad</Label>
                  <Select value={editing.severity} onValueChange={v => setEditing({ ...editing, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Estado</Label>
                  <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descripción *</Label>
                <Textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Notas internas</Label>
                <Textarea value={editing.internal_notes} onChange={e => setEditing({ ...editing, internal_notes: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>¿Cubierto por garantía?</Label>
                <Select value={editing.warranty_covered?.toString() || ''} onValueChange={v => setEditing({ ...editing, warranty_covered: v })}>
                  <SelectTrigger><SelectValue placeholder="Sin determinar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin determinar</SelectItem>
                    <SelectItem value="true">Sí</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!editing.buyer_id || !editing.vehicle_id || saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {editing.id ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
