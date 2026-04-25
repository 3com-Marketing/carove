import { useMemo, useState } from 'react';
import { ReservationDialog } from '@/components/reservations/ReservationDialog';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVehicles, updateVehicle, getActiveReservationByVehicle, getOperativeStatusBatch, getSaleByVehicleId, getInvoiceBySaleId, getInvoicePaymentSummary } from '@/lib/supabase-api';
import { formatCurrency as fmtCur } from '@/lib/constants';
import { formatCurrency, formatDate, daysInStock, VEHICLE_STATUSES, ALL_STATUSES } from '@/lib/constants';
import type { Vehicle, VehicleStatus, OperativeStatus } from '@/lib/types';
import { OperativeBadge } from '@/components/vehicles/OperativeBadge';
import { StatusBadge } from '@/components/vehicles/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Receipt, Loader2, LayoutGrid, List, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const KANBAN_STATUSES: VehicleStatus[] = ['disponible', 'reservado', 'vendido', 'entregado'];

const COLUMN_COLORS: Record<VehicleStatus, string> = {
  no_disponible: 'border-t-gray-400',
  disponible: 'border-t-status-disponible',
  reservado: 'border-t-status-reservado',
  vendido: 'border-t-status-vendido',
  entregado: 'border-t-status-entregado',
};

export default function SalesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const { data: allVehicles = [], isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });

  const activeVehicles = useMemo(() =>
    allVehicles.filter(v => !v.is_deregistered),
  [allVehicles]);

  const filtered = useMemo(() => {
    if (!search.trim()) return activeVehicles;
    const q = search.toLowerCase();
    return activeVehicles.filter(v =>
      v.plate.toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q)
    );
  }, [activeVehicles, search]);

  const columns = useMemo(() => {
    const map: Record<VehicleStatus, Vehicle[]> = {
      no_disponible: [], disponible: [], reservado: [], vendido: [], entregado: [],
    };
    filtered.forEach(v => map[v.status]?.push(v));
    return map;
  }, [filtered]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline de Ventas</h1>
          <p className="text-sm text-muted-foreground">
            {activeVehicles.length} vehículos en el flujo comercial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm w-48"
            />
          </div>
          <div className="flex rounded-lg bg-muted p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 px-2.5', view === 'kanban' && 'bg-card shadow-sm')}
              onClick={() => setView('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 px-2.5', view === 'table' && 'bg-card shadow-sm')}
              onClick={() => setView('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanBoard columns={columns} navigate={navigate} allVehicles={allVehicles} />
      ) : (
        <TableView vehicles={filtered} navigate={navigate} />
      )}
    </div>
  );
}

function DroppableColumn({ status, children }: { status: VehicleStatus; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 rounded-b-lg border border-t-0 bg-muted/30 p-2 space-y-2 min-h-[200px] transition-colors',
        isOver && 'bg-accent/10 ring-2 ring-accent/30'
      )}
    >
      {children}
    </div>
  );
}

function DraggableKanbanCard({ vehicle, onClick, operativeStatus }: { vehicle: Vehicle; onClick: () => void; operativeStatus?: OperativeStatus }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: vehicle.id,
    data: { vehicle },
    disabled: operativeStatus === 'en_transito',
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard vehicle={vehicle} onClick={onClick} operativeStatus={operativeStatus} />
    </div>
  );
}

function KanbanBoard({
  columns,
  navigate,
  allVehicles,
}: {
  columns: Record<VehicleStatus, Vehicle[]>;
  navigate: ReturnType<typeof useNavigate>;
  allVehicles: Vehicle[];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [pendingSaleVehicle, setPendingSaleVehicle] = useState<Vehicle | null>(null); // kept for navigation
  const [pendingReservationVehicle, setPendingReservationVehicle] = useState<Vehicle | null>(null);

  const allVehicleIds = useMemo(() => {
    const ids: string[] = [];
    KANBAN_STATUSES.forEach(s => columns[s].forEach(v => ids.push(v.id)));
    return ids;
  }, [columns]);

  const { data: operativeStatusMap = {} } = useQuery({
    queryKey: ['operative-status', allVehicleIds],
    queryFn: () => getOperativeStatusBatch(allVehicleIds),
    enabled: allVehicleIds.length > 0,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const v = allVehicles.find(v => v.id === event.active.id);
    setActiveVehicle(v || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveVehicle(null);
    const { active, over } = event;
    if (!over) return;

    const vehicleId = active.id as string;
    const newStatus = over.id as VehicleStatus;
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    if (!vehicle || vehicle.status === newStatus) return;

    // ── Regla operativa: bloquear entrega si en reparación o tránsito ──
    const opStatus = operativeStatusMap[vehicleId];
    if (newStatus === 'entregado' && opStatus === 'en_reparacion') {
      toast.error('No se puede entregar: el vehículo está en reparación.');
      return;
    }
    if (newStatus === 'entregado' && opStatus === 'en_transito') {
      toast.error('No se puede entregar: el vehículo está en tránsito.');
      return;
    }

    // ── Regla: bloquear entrega si factura no está cobrada ──
    if (newStatus === 'entregado') {
      try {
        const sale = await getSaleByVehicleId(vehicleId);
        if (sale) {
          const invoice = await getInvoiceBySaleId(sale.id);
          if (invoice) {
            const summary = await getInvoicePaymentSummary(invoice.id);
            if (summary.pending > 0.01) {
              toast.error(`No se puede entregar: pago pendiente de ${fmtCur(summary.pending)}. Registra el cobro de la factura antes de entregar.`);
              navigate(`/invoices/${invoice.id}`);
              return;
            }
          }
        }
      } catch (e) {
        console.error('Error checking payment status:', e);
      }
    }

    // ── Regla C: Block drag to "vendido" if active reservation ──
    if (newStatus === 'vendido') {
      const existingRes = await getActiveReservationByVehicle(vehicleId);
      if (existingRes) {
        toast.error('Este vehículo tiene una reserva activa. Conviértala en venta desde la reserva.');
        navigate(`/reservations/${existingRes.id}`);
        return;
      }
      navigate(`/sales/new?vehicleId=${vehicleId}`);
      return;
    }

    // ── Regla D: Block drag to "disponible" if active reservation ──
    if (newStatus === 'disponible') {
      const existingRes = await getActiveReservationByVehicle(vehicleId);
      if (existingRes) {
        toast.error('Cancele o expire la reserva primero.');
        return;
      }
    }

    // ── Intercept drag to "reservado" ──
    if (newStatus === 'reservado') {
      const existingRes = await getActiveReservationByVehicle(vehicleId);
      if (existingRes) {
        toast.info('Este vehículo ya tiene una reserva activa');
        navigate(`/reservations/${existingRes.id}`);
        return;
      }
      setPendingReservationVehicle(vehicle);
      return;
    }

    // Optimistic update for other statuses
    queryClient.setQueryData<Vehicle[]>(['vehicles'], old =>
      (old || []).map(v => v.id === vehicleId ? { ...v, status: newStatus } : v)
    );

    try {
      await updateVehicle(vehicleId, { status: newStatus } as any, user?.id || '');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`${vehicle.brand} ${vehicle.model} → ${VEHICLE_STATUSES[newStatus].label}`);
    } catch {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.error('Error al mover el vehículo');
    }
  };

  const handleSaleConfirm = () => {
    setPendingSaleVehicle(null);
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
  };

  const handleReservationConfirm = () => {
    setPendingReservationVehicle(null);
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
    toast.success('¡Reserva creada con éxito!');
  };

  const handleReservationCancel = () => {
    setPendingReservationVehicle(null);
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-4 min-w-max">
            {KANBAN_STATUSES.map(status => (
              <div key={status} className="w-[260px] shrink-0 flex flex-col">
                <div className={cn(
                  'rounded-t-lg border border-b-0 border-t-[3px] bg-card px-3 py-2.5 flex items-center justify-between',
                  COLUMN_COLORS[status]
                )}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{VEHICLE_STATUSES[status].label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs h-5 min-w-[22px] justify-center">
                    {columns[status].length}
                  </Badge>
                </div>

                <DroppableColumn status={status}>
                  {columns[status].length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8 italic">Sin vehículos</p>
                  ) : (
                    columns[status].map(v => (
                      <DraggableKanbanCard key={v.id} vehicle={v} onClick={() => navigate(`/vehicles/${v.id}`)} operativeStatus={operativeStatusMap[v.id]} />
                    ))
                  )}
                </DroppableColumn>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeVehicle && (
            <div className="w-[260px] opacity-90 rotate-2">
              <KanbanCard vehicle={activeVehicle} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>


      {pendingReservationVehicle && (
        <ReservationDialog
          vehicle={pendingReservationVehicle}
          open={!!pendingReservationVehicle}
          onConfirm={handleReservationConfirm}
          onCancel={handleReservationCancel}
        />
      )}
    </>
  );
}

function KanbanCard({ vehicle: v, onClick, operativeStatus }: { vehicle: Vehicle; onClick: () => void; operativeStatus?: OperativeStatus }) {
  const dias = daysInStock(v.expo_date);

  return (
    <Card
      className="border shadow-sm cursor-pointer hover:shadow-md hover:border-accent/30 transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
              {v.brand} {v.model}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{v.version}</p>
          </div>
          {operativeStatus && operativeStatus !== 'normal' && (
            <OperativeBadge status={operativeStatus} className="shrink-0 text-[10px] px-1.5 py-0.5" />
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">{v.plate}</span>
          <span className="capitalize">{v.engine_type}</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-dashed">
          <span className="text-sm font-bold">{formatCurrency(v.pvp_base)}</span>
          <div className="flex items-center gap-1.5">
            {dias > 60 && v.status === 'disponible' && (
              <span className="flex items-center gap-0.5 text-[10px] text-status-vendido" title={`${dias} días en stock`}>
                <Clock className="h-3 w-3" /> {dias}d
              </span>
            )}
            <span className={cn(
              'text-xs font-semibold',
              v.net_profit >= 0 ? 'text-status-disponible' : 'text-destructive'
            )}>
              {v.net_profit >= 0 ? '+' : ''}{formatCurrency(v.net_profit)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{v.center}</span>
          {v.sale_date && <span>Venta: {formatDate(v.sale_date)}</span>}
          {!v.sale_date && <span>Expo: {formatDate(v.expo_date)}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function TableView({
  vehicles,
  navigate,
}: {
  vehicles: Vehicle[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const sorted = useMemo(() =>
    [...vehicles].sort((a, b) => {
      const order: Record<VehicleStatus, number> = { no_disponible: -1, disponible: 0, reservado: 1, vendido: 2, entregado: 3 };
      return order[a.status] - order[b.status];
    }),
  [vehicles]);

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Marca / Modelo</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead>F. Venta</TableHead>
              <TableHead>F. Entrega</TableHead>
              <TableHead className="text-right">PVP</TableHead>
              <TableHead className="text-right">Beneficio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Sin vehículos en el pipeline.
                </TableCell>
              </TableRow>
            ) : sorted.map(v => (
              <TableRow key={v.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/vehicles/${v.id}`)}>
                <TableCell><StatusBadge status={v.status} /></TableCell>
                <TableCell className="font-medium">{v.brand} {v.model}</TableCell>
                <TableCell className="font-mono text-xs">{v.plate}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{v.center}</TableCell>
                <TableCell className="text-xs">{formatDate(v.sale_date)}</TableCell>
                <TableCell className="text-xs">{formatDate(v.delivery_date)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(v.pvp_base)}</TableCell>
                <TableCell className={cn('text-right font-semibold', v.net_profit >= 0 ? 'text-status-disponible' : 'text-destructive')}>
                  {formatCurrency(v.net_profit)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
