import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getReservations, getBuyers, getVehicles } from '@/lib/supabase-api';
import { formatCurrency, formatDate } from '@/lib/constants';
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS } from '@/lib/types';
import type { Reservation, ReservationWorkflowStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInHours, isPast } from 'date-fns';

type FilterTab = 'todas' | 'draft' | 'pending_signature' | 'signed' | 'converted' | 'expired' | 'cancelled';

export default function ReservationList() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<FilterTab>('todas');
  const { data: reservations = [], isLoading: loadingR } = useQuery({ queryKey: ['reservations'], queryFn: () => getReservations() });
  const { data: buyers = [] } = useQuery({ queryKey: ['buyers'], queryFn: getBuyers });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const buyerMap = useMemo(() => new Map(buyers.map(b => [b.id, b])), [buyers]);
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);

  const filtered = useMemo(() => {
    return reservations.filter(r => {
      const wf = (r as any).reservation_status || 'draft';
      if (tab === 'todas') return true;
      if (tab === 'expired') {
        if (wf === 'expired') return true;
        if (wf === 'signed' && isPast(new Date(r.expiration_date))) return true;
        return false;
      }
      return wf === tab;
    });
  }, [reservations, tab]);

  // Counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: reservations.length };
    for (const r of reservations) {
      const wf = (r as any).reservation_status || 'draft';
      c[wf] = (c[wf] || 0) + 1;
      if (wf === 'signed' && isPast(new Date(r.expiration_date))) {
        c['expired'] = (c['expired'] || 0) + 1;
      }
    }
    return c;
  }, [reservations]);

  if (loadingR) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarCheck className="h-6 w-6 text-accent" /> Reservas
        </h1>
        <p className="text-sm text-muted-foreground">{counts['signed'] || 0} reservas activas · {reservations.length} total</p>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as FilterTab)}>
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max md:w-full justify-start bg-muted/50 h-auto">
            <TabsTrigger value="todas" className="text-xs py-2.5">Todas ({counts['todas'] || 0})</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs py-2.5">Borrador ({counts['draft'] || 0})</TabsTrigger>
            <TabsTrigger value="pending_signature" className="text-xs py-2.5">Pdte. firma ({counts['pending_signature'] || 0})</TabsTrigger>
            <TabsTrigger value="signed" className="text-xs py-2.5">Firmadas ({counts['signed'] || 0})</TabsTrigger>
            <TabsTrigger value="expired" className="text-xs py-2.5">Vencidas ({counts['expired'] || 0})</TabsTrigger>
            <TabsTrigger value="converted" className="text-xs py-2.5">Convertidas ({counts['converted'] || 0})</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs py-2.5">Canceladas ({counts['cancelled'] || 0})</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Señal</TableHead>
                <TableHead>Fecha límite</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Sin reservas en este filtro.
                  </TableCell>
                </TableRow>
              ) : filtered.map(r => {
                const v = vehicleMap.get(r.vehicle_id);
                const b = buyerMap.get(r.buyer_id);
                const wf = ((r as any).reservation_status || 'draft') as ReservationWorkflowStatus;
                const isExpired = wf === 'signed' && isPast(new Date(r.expiration_date));
                const hoursLeft = differenceInHours(new Date(r.expiration_date), new Date());
                const depositPaid = (r as any).deposit_paid;

                return (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/reservations/${r.id}`)}>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {(r as any).reservation_number || '—'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-sm font-medium">{v ? `${v.brand} ${v.model}` : '—'}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">{v?.plate}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{b?.name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-sm font-semibold">{formatCurrency(r.reservation_amount)}</span>
                        {depositPaid && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={cn(isExpired && 'text-destructive font-medium')}>
                        {formatDate(r.expiration_date)}
                      </span>
                      {!isExpired && hoursLeft <= 48 && hoursLeft > 0 && wf === 'signed' && (
                        <span className="text-xs text-amber-600 ml-1">({hoursLeft}h)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px] border', isExpired ? RESERVATION_STATUS_COLORS['expired'] : RESERVATION_STATUS_COLORS[wf])}>
                        {isExpired ? 'Vencida' : RESERVATION_STATUS_LABELS[wf]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
