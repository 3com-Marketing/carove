import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDemands, getBuyers } from '@/lib/supabase-api';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/constants';
import { DEMAND_STATUS_LABELS, INTENTION_LEVEL_LABELS } from '@/lib/types';
import type { DemandStatus, IntentionLevel } from '@/lib/types';
import { Target, AlertTriangle } from 'lucide-react';

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

export default function DemandList() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [intentionFilter, setIntentionFilter] = useState<string>('all');

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ['demands'],
    queryFn: getDemands,
  });

  const { data: buyers = [] } = useQuery({
    queryKey: ['buyers'],
    queryFn: getBuyers,
  });

  const getBuyerName = (buyerId: string) => {
    const b = buyers.find(x => x.id === buyerId);
    if (!b) return '—';
    return b.client_type === 'profesional' ? (b.company_name || b.name) : [b.name, b.last_name].filter(Boolean).join(' ');
  };

  const filtered = demands.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (intentionFilter !== 'all' && d.intention_level !== intentionFilter) return false;
    return true;
  });

  const activeDemands = demands.filter(d => !['convertida', 'cancelada', 'caducada'].includes(d.status));
  const highIntention = activeDemands.filter(d => ['compra_inmediata', 'financiacion_aprobada'].includes(d.intention_level));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6" /> Mis Demandas</h1>
          <p className="text-sm text-muted-foreground">{activeDemands.length} activas · {highIntention.length} alta intención</p>
        </div>
      </div>

      {/* Indicators */}
      {highIntention.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              {highIntention.length} demanda(s) de alta intención requieren atención prioritaria
            </span>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.entries(DEMAND_STATUS_LABELS) as [DemandStatus, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={intentionFilter} onValueChange={setIntentionFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Intención" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las intenciones</SelectItem>
            {(Object.entries(INTENTION_LEVEL_LABELS) as [IntentionLevel, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sin demandas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Intención</TableHead>
                  <TableHead>Presupuesto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Preferencias</TableHead>
                  {isAdmin && <TableHead>Comercial</TableHead>}
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d => (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/demands/${d.id}`)}>
                    <TableCell className="font-medium">{getBuyerName(d.buyer_id)}</TableCell>
                    <TableCell>
                      <Badge className={INTENTION_COLORS[d.intention_level] || ''} variant="secondary">
                        {INTENTION_LEVEL_LABELS[d.intention_level]}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.max_budget ? formatCurrency(d.max_budget) : d.price_max ? `Hasta ${formatCurrency(d.price_max)}` : '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[d.status]} variant="secondary">
                        {DEMAND_STATUS_LABELS[d.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {[
                        ...d.brand_preferences,
                        ...d.fuel_types,
                        d.transmission,
                      ].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    {isAdmin && <TableCell className="text-xs">{d.user_name}</TableCell>}
                    <TableCell className="text-xs text-muted-foreground">{formatDate(d.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
