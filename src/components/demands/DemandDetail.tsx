import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { updateDemand, getBuyerById, getActivitiesByBuyer } from '@/lib/supabase-api';
import { formatCurrency, formatDate } from '@/lib/constants';
import { DEMAND_STATUS_LABELS, INTENTION_LEVEL_LABELS } from '@/lib/types';
import type { Demand, DemandStatus } from '@/lib/types';
import { DemandMatchList } from './DemandMatchList';
import { DemandDialog } from './DemandDialog';
import { ActivityTimeline } from '@/components/commercial/ActivityTimeline';
import { QuickActivityButtons } from '@/components/commercial/QuickActivityButtons';
import { Pencil, Ban, ShoppingCart, Target } from 'lucide-react';

const STATUS_COLORS: Record<DemandStatus, string> = {
  activa: 'bg-emerald-100 text-emerald-800',
  en_seguimiento: 'bg-blue-100 text-blue-800',
  en_negociacion: 'bg-amber-100 text-amber-800',
  convertida: 'bg-primary/10 text-primary',
  cancelada: 'bg-destructive/10 text-destructive',
  caducada: 'bg-muted text-muted-foreground',
};

const INTENTION_COLORS: Record<string, string> = {
  exploracion: 'bg-muted text-muted-foreground',
  interesado_activo: 'bg-blue-100 text-blue-800',
  compra_inmediata: 'bg-amber-100 text-amber-800',
  financiacion_aprobada: 'bg-emerald-100 text-emerald-800',
};

interface Props {
  demand: Demand;
  onRefresh: () => void;
}

export function DemandDetail({ demand, onRefresh }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: buyer } = useQuery({
    queryKey: ['buyer', demand.buyer_id],
    queryFn: () => getBuyerById(demand.buyer_id),
  });

  const buyerName = buyer
    ? (buyer.client_type === 'profesional' ? buyer.company_name || buyer.name : [buyer.name, buyer.last_name].filter(Boolean).join(' '))
    : '';

  const handleStatusChange = async (newStatus: DemandStatus) => {
    try {
      await updateDemand(demand.id, { status: newStatus });
      toast({ title: `Estado cambiado a ${DEMAND_STATUS_LABELS[newStatus]}` });
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast({ title: 'Motivo obligatorio', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await updateDemand(demand.id, {
        status: 'cancelada',
        cancelled_reason: cancelReason.trim(),
        cancelled_at: new Date().toISOString(),
        cancelled_by: user!.id,
      } as any);
      toast({ title: 'Demanda cancelada' });
      setCancelOpen(false);
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isActive = !['convertida', 'cancelada', 'caducada'].includes(demand.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="h-5 w-5" />
            Demanda de {buyerName}
          </h2>
          <div className="flex gap-2 mt-1">
            <Badge className={STATUS_COLORS[demand.status]}>{DEMAND_STATUS_LABELS[demand.status]}</Badge>
            <Badge className={INTENTION_COLORS[demand.intention_level]}>{INTENTION_LEVEL_LABELS[demand.intention_level]}</Badge>
            <span className="text-xs text-muted-foreground">Creada {formatDate(demand.created_at)} por {demand.user_name}</span>
          </div>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Editar
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setCancelOpen(true)}>
              <Ban className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Estado */}
      {isActive && (
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Label className="text-sm">Cambiar estado:</Label>
            <Select value={demand.status} onValueChange={v => handleStatusChange(v as DemandStatus)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['activa', 'en_seguimiento', 'en_negociacion'] as DemandStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{DEMAND_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Resumen de preferencias */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Preferencias</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {demand.brand_preferences.length > 0 && (
              <Field label="Marcas" value={demand.brand_preferences.join(', ')} />
            )}
            {demand.model_preferences.length > 0 && (
              <Field label="Modelos" value={demand.model_preferences.join(', ')} />
            )}
            {demand.fuel_types.length > 0 && (
              <Field label="Combustible" value={demand.fuel_types.join(', ')} />
            )}
            {demand.transmission && <Field label="Cambio" value={demand.transmission} />}
            {(demand.year_min || demand.year_max) && (
              <Field label="Año" value={`${demand.year_min || '—'} - ${demand.year_max || '—'}`} />
            )}
            {demand.km_max && <Field label="Km máx." value={`${demand.km_max.toLocaleString()} km`} />}
            {(demand.price_min || demand.price_max) && (
              <Field label="Precio" value={`${demand.price_min ? formatCurrency(demand.price_min) : '—'} - ${demand.price_max ? formatCurrency(demand.price_max) : '—'}`} />
            )}
            {demand.preferred_color && <Field label="Color" value={demand.preferred_color} />}
            {demand.required_extras && <Field label="Extras" value={demand.required_extras} />}
            {demand.max_budget && <Field label="Presupuesto máx." value={formatCurrency(demand.max_budget)} />}
            <Field label="Financiación" value={demand.needs_financing ? 'Sí' : 'No'} />
            {demand.down_payment && <Field label="Entrada" value={formatCurrency(demand.down_payment)} />}
            <Field label="Vehículo a entregar" value={demand.has_trade_in ? 'Sí' : 'No'} />
            {demand.trade_in_notes && <Field label="Tasación" value={demand.trade_in_notes} />}
          </div>
          {demand.commercial_notes && (
            <div className="mt-3 p-3 bg-muted rounded-md text-sm">{demand.commercial_notes}</div>
          )}
        </CardContent>
      </Card>

      {/* Coincidencias */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Coincidencias con stock</CardTitle></CardHeader>
        <CardContent>
          <DemandMatchList demand={demand} />
        </CardContent>
      </Card>

      {/* Actividades vinculadas */}
      {isActive && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Registro rápido</CardTitle></CardHeader>
          <CardContent>
            <QuickActivityButtons buyerId={demand.buyer_id} onSaved={() => queryClient.invalidateQueries({ queryKey: ['buyer-activities'] })} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Actividad del cliente</CardTitle></CardHeader>
        <CardContent>
          <ActivityTimeline buyerId={demand.buyer_id} />
        </CardContent>
      </Card>

      {/* Cancelación dialog */}
      {demand.cancelled_reason && (
        <Card className="border-destructive/30">
          <CardContent className="pt-4">
            <p className="text-sm"><strong>Motivo cancelación:</strong> {demand.cancelled_reason}</p>
            <p className="text-xs text-muted-foreground">Cancelada {formatDate(demand.cancelled_at || '')}</p>
          </CardContent>
        </Card>
      )}

      {/* Conversión */}
      {demand.converted_sale_id && (
        <Card className="border-primary/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-primary">✅ Convertida en venta</p>
            <p className="text-xs text-muted-foreground">
              Convertida {formatDate(demand.converted_at || '')} —
              Tiempo: {Math.round((new Date(demand.converted_at || '').getTime() - new Date(demand.created_at).getTime()) / 86400000)} días
            </p>
          </CardContent>
        </Card>
      )}

      <DemandDialog open={editOpen} onOpenChange={setEditOpen} demand={demand} buyerId={demand.buyer_id} onSaved={onRefresh} />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar demanda</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Motivo de cancelación *</Label>
            <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Indica el motivo..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Volver</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={saving}>
              {saving ? 'Cancelando...' : 'Confirmar cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
