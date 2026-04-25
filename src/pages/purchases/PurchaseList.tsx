import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getVehiclePurchases } from '@/lib/supabase-api';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { PurchaseStatusBadge } from '@/components/purchases/PurchaseStatusBadge';
import { PurchaseDialog } from '@/components/purchases/PurchaseDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ShoppingCart, ClipboardCheck, Clock, CheckCircle2 } from 'lucide-react';
import { PURCHASE_STATUS_LABELS, PURCHASE_SOURCE_LABELS } from '@/lib/types';
import type { PurchaseStatus, PurchaseSourceType } from '@/lib/types';

export default function PurchaseList() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: purchases = [], refetch } = useQuery({
    queryKey: ['vehicle-purchases'],
    queryFn: getVehiclePurchases,
  });

  // Preparation KPIs
  const { data: prepStats = { pendiente: 0, en_progreso: 0, completado: 0 } } = useQuery({
    queryKey: ['preparation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('preparation_status')
        .not('preparation_status', 'is', null);
      if (error) throw error;
      const stats = { pendiente: 0, en_progreso: 0, completado: 0 };
      (data || []).forEach((v: any) => {
        if (v.preparation_status in stats) stats[v.preparation_status as keyof typeof stats]++;
      });
      return stats;
    },
  });

  const filtered = purchases.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && p.source_type !== sourceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.seller_name?.toLowerCase().includes(q) || p.vehicle_info?.toLowerCase().includes(q));
    }
    return true;
  });

  // Pipeline counts
  const activePipeline = purchases.filter(p => !['comprado', 'cancelado', 'rechazado'].includes(p.status));
  const completedCount = purchases.filter(p => p.status === 'comprado').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compras de Vehículos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activePipeline.length} en pipeline · {completedCount} completadas
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva compra
        </Button>
      </div>

      {/* Preparation KPI cards */}
      {(prepStats.pendiente + prepStats.en_progreso + prepStats.completado) > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{prepStats.pendiente}</p>
                  <p className="text-xs text-muted-foreground">Pendientes de preparación</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{prepStats.en_progreso}</p>
                  <p className="text-xs text-muted-foreground">En preparación</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{prepStats.completado}</p>
                  <p className="text-xs text-muted-foreground">Listos para venta</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar vendedor o vehículo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.entries(PURCHASE_STATUS_LABELS) as [PurchaseStatus, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Origen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            {(Object.entries(PURCHASE_SOURCE_LABELS) as [PurchaseSourceType, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-right">Solicitado</TableHead>
                <TableHead className="text-right">Ofertado</TableHead>
                <TableHead className="text-right">Acordado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    No hay operaciones de compra
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/purchases/${p.id}`)}>
                    <TableCell className="font-medium">{p.vehicle_info || '—'}</TableCell>
                    <TableCell>{p.seller_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PURCHASE_SOURCE_LABELS[p.source_type as PurchaseSourceType] || p.source_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(p.requested_price || 0)}</TableCell>
                    <TableCell className="text-right">{p.offered_price != null ? formatCurrency(p.offered_price) : '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{p.agreed_price != null ? formatCurrency(p.agreed_price) : '—'}</TableCell>
                    <TableCell><PurchaseStatusBadge status={p.status as PurchaseStatus} /></TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={() => refetch()} />
    </div>
  );
}
