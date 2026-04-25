import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Phone, Plus, Loader2, Calendar, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const FOLLOWUP_TYPES = [
  'llamada', 'whatsapp', 'email', 'revision_satisfaccion', 'recordatorio',
  'gestion_documental', 'incidencia', 'reclamacion', 'financiacion', 'revision_mantenimiento',
];
const FOLLOWUP_STATUSES = ['pendiente', 'realizado', 'en_espera', 'cerrado'];

const typeLabels: Record<string, string> = {
  llamada: 'Llamada', whatsapp: 'WhatsApp', email: 'Email',
  revision_satisfaccion: 'Revisión satisfacción', recordatorio: 'Recordatorio',
  gestion_documental: 'Gestión documental', incidencia: 'Incidencia',
  reclamacion: 'Reclamación', financiacion: 'Financiación', revision_mantenimiento: 'Revisión/Mantenimiento',
};

const statusColors: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  realizado: 'bg-emerald-100 text-emerald-700',
  en_espera: 'bg-blue-100 text-blue-700',
  cerrado: 'bg-muted text-muted-foreground',
};

export default function FollowupsPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pendiente');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: followups = [], isLoading } = useQuery({
    queryKey: ['pv-followups', statusFilter, typeFilter],
    queryFn: async () => {
      let q = supabase
        .from('pv_followups')
        .select('*, buyers(name, last_name), vehicles(brand, model, plate)')
        .order('scheduled_date', { ascending: true })
        .limit(500);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as any);
      if (typeFilter !== 'all') q = q.eq('followup_type', typeFilter as any);
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
        vehicle_id: form.vehicle_id || null,
        sale_id: form.sale_id || null,
        assigned_to: user!.id,
        assigned_to_name: profile?.full_name || '',
        followup_type: form.followup_type,
        scheduled_date: form.scheduled_date,
        completed_date: form.completed_date || null,
        status: form.status,
        notes: form.notes,
        result: form.result,
        next_action: form.next_action,
        next_followup_date: form.next_followup_date || null,
        created_by: user!.id,
      };
      if (editing?.id) {
        const { error } = await supabase.from('pv_followups').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pv_followups').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pv-followups'] });
      toast({ title: editing?.id ? 'Seguimiento actualizado' : 'Seguimiento creado' });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openNew = () => {
    setEditing({
      buyer_id: '', vehicle_id: '', followup_type: 'llamada',
      scheduled_date: new Date().toISOString().slice(0, 10),
      status: 'pendiente', notes: '', result: '', next_action: '',
      next_followup_date: '', completed_date: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (f: any) => {
    setEditing({
      ...f,
      scheduled_date: f.scheduled_date || '',
      completed_date: f.completed_date || '',
      next_followup_date: f.next_followup_date || '',
    });
    setDialogOpen(true);
  };

  const today = new Date().toISOString().slice(0, 10);
  const filtered = followups.filter((f: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const buyerName = `${f.buyers?.name || ''} ${f.buyers?.last_name || ''}`.toLowerCase();
    const veh = `${f.vehicles?.brand || ''} ${f.vehicles?.model || ''} ${f.vehicles?.plate || ''}`.toLowerCase();
    return buyerName.includes(s) || veh.includes(s) || (f.notes || '').toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" /> Seguimientos Postventa
          </h1>
          <p className="text-sm text-muted-foreground">{filtered.length} seguimientos</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nuevo seguimiento</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, vehículo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {FOLLOWUP_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {FOLLOWUP_TYPES.map(t => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin seguimientos</TableCell></TableRow>
                ) : filtered.map((f: any) => {
                  const overdue = f.status === 'pendiente' && f.scheduled_date < today;
                  return (
                    <TableRow key={f.id} className={cn('cursor-pointer hover:bg-muted/50', overdue && 'bg-destructive/5')} onClick={() => openEdit(f)}>
                      <TableCell className={cn(overdue && 'text-destructive font-medium')}>
                        {formatDate(f.scheduled_date)} {overdue && '⚠'}
                      </TableCell>
                      <TableCell>{typeLabels[f.followup_type] || f.followup_type}</TableCell>
                      <TableCell>{f.buyers?.name} {f.buyers?.last_name || ''}</TableCell>
                      <TableCell className="text-muted-foreground">{f.vehicles?.brand} {f.vehicles?.model} {f.vehicles?.plate && `(${f.vehicles.plate})`}</TableCell>
                      <TableCell><Badge className={cn('text-[10px]', statusColors[f.status])}>{f.status}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{f.notes}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar seguimiento' : 'Nuevo seguimiento'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(editing); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Cliente *</Label>
                  <Select value={editing.buyer_id} onValueChange={v => setEditing({ ...editing, buyer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                    <SelectContent>
                      {buyers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name} {b.last_name || ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Vehículo</Label>
                  <Select value={editing.vehicle_id || ''} onValueChange={v => setEditing({ ...editing, vehicle_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={editing.followup_type} onValueChange={v => setEditing({ ...editing, followup_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FOLLOWUP_TYPES.map(t => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FOLLOWUP_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha programada *</Label>
                  <Input type="date" value={editing.scheduled_date} onChange={e => setEditing({ ...editing, scheduled_date: e.target.value })} />
                </div>
                <div>
                  <Label>Fecha realizada</Label>
                  <Input type="date" value={editing.completed_date} onChange={e => setEditing({ ...editing, completed_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Resultado</Label>
                <Input value={editing.result} onChange={e => setEditing({ ...editing, result: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Próxima acción</Label>
                  <Input value={editing.next_action} onChange={e => setEditing({ ...editing, next_action: e.target.value })} />
                </div>
                <div>
                  <Label>Próximo seguimiento</Label>
                  <Input type="date" value={editing.next_followup_date} onChange={e => setEditing({ ...editing, next_followup_date: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={!editing.buyer_id || !editing.scheduled_date || saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
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
