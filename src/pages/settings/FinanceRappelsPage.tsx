import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { format, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Pencil, Trash2, Landmark } from 'lucide-react';
import { toast } from 'sonner';

const periodLabels: Record<string, string> = { mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual' };

function getPeriodStart(periodType: string): string {
  const now = new Date();
  switch (periodType) {
    case 'trimestral': return format(startOfQuarter(now), 'yyyy-MM-dd');
    case 'anual': return format(startOfYear(now), 'yyyy-MM-dd');
    default: return format(startOfMonth(now), 'yyyy-MM-dd');
  }
}

function getTierStatus(tier: any, currentVolume: number, sortedTiers: any[]) {
  const idx = sortedTiers.indexOf(tier);
  const nextTier = sortedTiers[idx + 1];
  if (nextTier && currentVolume >= nextTier.threshold_volume) return 'superado';
  if (currentVolume >= tier.threshold_volume) return 'activo';
  return 'pendiente';
}

export default function FinanceRappelsPage() {
  const { isAdmin } = useRole();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ entity_id: '', threshold_volume: 0, rappel_percent: 0, period_type: 'mensual' });
  const [saving, setSaving] = useState(false);

  const { data: entities = [] } = useQuery({
    queryKey: ['finance-entities-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('finance_entities').select('id, name').eq('active', true).order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rappels = [], refetch } = useQuery({
    queryKey: ['finance-rappels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('finance_rappels').select('*').order('entity_name').order('threshold_volume');
      if (error) throw error;
      return data || [];
    },
  });

  // Load all approved simulations from start of year (we filter per period later)
  const yearStart = format(startOfYear(new Date()), 'yyyy-MM-dd');
  const { data: simulations = [] } = useQuery({
    queryKey: ['finance-simulations-volume-year', yearStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_simulations')
        .select('entity_name_snapshot, financed_amount, created_at')
        .eq('status', 'aprobada')
        .gte('created_at', yearStart);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate volume and ops count by entity for a given period
  const getVolumeForEntity = (entityName: string, periodType: string) => {
    const periodStart = getPeriodStart(periodType);
    let volume = 0;
    let ops = 0;
    simulations.forEach((s: any) => {
      if (s.entity_name_snapshot === entityName && s.created_at >= periodStart) {
        volume += Number(s.financed_amount || 0);
        ops++;
      }
    });
    return { volume, ops };
  };

  const getEntityName = (id: string) => entities.find((e: any) => e.id === id)?.name || '';

  const openNew = () => {
    setEditing(null);
    setForm({ entity_id: '', threshold_volume: 0, rappel_percent: 0, period_type: 'mensual' });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      entity_id: r.entity_id || '',
      threshold_volume: r.threshold_volume,
      rappel_percent: r.rappel_percent,
      period_type: r.period_type,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.entity_id) { toast.error('Selecciona una entidad financiera'); return; }
    if (form.threshold_volume <= 0) { toast.error('El volumen umbral debe ser mayor que 0'); return; }
    if (form.rappel_percent <= 0) { toast.error('El porcentaje debe ser mayor que 0'); return; }
    setSaving(true);
    const entityName = getEntityName(form.entity_id);
    const payload = {
      entity_id: form.entity_id,
      entity_name: entityName,
      threshold_volume: form.threshold_volume,
      rappel_percent: form.rappel_percent,
      period_type: form.period_type,
      created_by: user?.id || '',
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('finance_rappels').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('finance_rappels').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Rappel actualizado' : 'Rappel creado');
    setDialogOpen(false);
    refetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('finance_rappels').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Rappel eliminado'); refetch(); }
  };

  // Group by entity
  const groupedEntities = useMemo(() => {
    const map = new Map<string, { name: string; rappels: any[] }>();
    rappels.forEach((r: any) => {
      const key = r.entity_id || r.entity_name;
      if (!map.has(key)) {
        map.set(key, { name: r.entity_id ? getEntityName(r.entity_id) || r.entity_name : r.entity_name, rappels: [] });
      }
      map.get(key)!.rappels.push(r);
    });
    return Array.from(map.entries());
  }, [rappels, entities]);

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Rappels Financieros</h1>
          <p className="text-sm text-muted-foreground">Configura escalones de rappel por entidad financiera</p>
        </div>
        <Button onClick={openNew}>
          <PlusCircle className="h-4 w-4 mr-2" /> Nuevo rappel
        </Button>
      </div>

      {groupedEntities.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Sin rappels configurados
          </CardContent>
        </Card>
      ) : (
        groupedEntities.map(([key, group]) => {
          const sortedTiers = [...group.rappels].sort((a: any, b: any) => a.threshold_volume - b.threshold_volume);
          // Use period from first tier (all tiers for an entity should share the same period)
          const mainPeriod = sortedTiers[0]?.period_type || 'mensual';
          const { volume: currentVolume, ops } = getVolumeForEntity(group.name, mainPeriod);
          const currentTier = sortedTiers.filter((t: any) => t.threshold_volume <= currentVolume).pop();
          const nextTier = sortedTiers.find((t: any) => t.threshold_volume > currentVolume);

          const currentBase = currentTier ? currentTier.threshold_volume : 0;
          const nextTarget = nextTier ? nextTier.threshold_volume : currentBase;
          const progress = nextTier && nextTarget > currentBase
            ? Math.min(((currentVolume - currentBase) / (nextTarget - currentBase)) * 100, 100)
            : sortedTiers.length > 0 ? 100 : 0;

          return (
            <Card key={key} className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" />
                  {group.name}
                  <Badge variant="secondary" className="ml-1 text-xs">{periodLabels[mainPeriod]}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress section */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volumen financiado ({periodLabels[mainPeriod].toLowerCase()})</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{ops} operaciones</Badge>
                      <span className="font-semibold">{currentVolume.toLocaleString('es-ES')}€</span>
                      {currentTier && (
                        <Badge variant="default">{currentTier.rappel_percent}% rappel actual</Badge>
                      )}
                    </div>
                  </div>
                  {nextTier ? (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Siguiente tramo: {nextTier.threshold_volume.toLocaleString('es-ES')}€ → {nextTier.rappel_percent}%
                        {' '}(faltan {(nextTier.threshold_volume - currentVolume).toLocaleString('es-ES')}€)
                      </p>
                    </div>
                  ) : sortedTiers.length > 0 ? (
                    <div className="space-y-1">
                      <Progress value={100} className="h-2" />
                      <p className="text-xs text-muted-foreground">Máximo tramo alcanzado</p>
                    </div>
                  ) : null}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Volumen umbral (€)</TableHead>
                      <TableHead>Rappel (%)</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTiers.map((r: any) => {
                      const status = getTierStatus(r, currentVolume, sortedTiers);
                      return (
                        <TableRow key={r.id} className={status === 'activo' ? 'bg-primary/5' : ''}>
                          <TableCell className="font-medium">{r.threshold_volume.toLocaleString('es-ES')}€</TableCell>
                          <TableCell className="font-semibold text-primary">{r.rappel_percent}%</TableCell>
                          <TableCell><Badge variant="secondary">{periodLabels[r.period_type] || r.period_type}</Badge></TableCell>
                          <TableCell>
                            {status === 'activo' && <Badge variant="default">Activo</Badge>}
                            {status === 'superado' && <Badge variant="secondary">Superado</Badge>}
                            {status === 'pendiente' && <Badge variant="outline">Pendiente</Badge>}
                          </TableCell>
                          <TableCell className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar rappel' : 'Nuevo rappel financiero'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Entidad financiera</Label>
              <Select value={form.entity_id} onValueChange={v => setForm({ ...form, entity_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar entidad..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Solo entidades financieras activas</p>
            </div>
            <div>
              <Label>Volumen umbral (€)</Label>
              <Input type="number" min={1} value={form.threshold_volume || ''} onChange={e => setForm({ ...form, threshold_volume: Number(e.target.value) })} placeholder="Ej: 50000" />
              <p className="text-xs text-muted-foreground mt-1">Volumen mínimo para aplicar este tramo</p>
            </div>
            <div>
              <Label>Porcentaje rappel (%)</Label>
              <Input type="number" min={0.1} step={0.1} value={form.rappel_percent || ''} onChange={e => setForm({ ...form, rappel_percent: Number(e.target.value) })} placeholder="Ej: 1.5" />
              <p className="text-xs text-muted-foreground mt-1">Porcentaje que la entidad bonifica</p>
            </div>
            <div>
              <Label>Periodo</Label>
              <Select value={form.period_type} onValueChange={v => setForm({ ...form, period_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Periodo de cálculo del volumen</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
