import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPendingTransfers, getAllTransfers, sendTransfer, receiveTransfer, cancelTransfer, getVehicles } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { formatDate } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight, Send, PackageCheck, Ban, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranches } from '@/hooks/useBranches';
import type { VehicleTransfer, Vehicle } from '@/lib/types';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  solicitado: { label: 'Solicitado', className: 'bg-amber-500 text-white' },
  enviado: { label: 'Enviado', className: 'bg-blue-500 text-white' },
  recibido: { label: 'Recibido', className: 'bg-emerald-500 text-white' },
  cancelado: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
};

export default function TransfersPendingPage() {
  const { user, profile } = useAuth();
  const { data: branches = [] } = useBranches();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  // profile.branch_id es uuid; las tablas vehicle_transfers usan nombre de sucursal
  // como string, así que resolvemos el nombre del usuario desde la lista de branches.
  const userBranchId = profile?.branch_id ?? null;
  const userBranch = branches.find(b => b.id === userBranchId)?.name || null;
  const [branchFilter, setBranchFilter] = useState<string>(userBranch || 'all');

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['pending-transfers'],
    queryFn: () => getPendingTransfers(),
  });
  const { data: allTransfers = [] } = useQuery({
    queryKey: ['all-transfers'],
    queryFn: () => getAllTransfers(100),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  });

  const [saving, setSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const vehicleMap = new Map(vehicles.map((v: Vehicle) => [v.id, v]));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pending-transfers'] });
    qc.invalidateQueries({ queryKey: ['all-transfers'] });
    qc.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const handleSend = async (id: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await sendTransfer(id, user.id);
      invalidate();
      toast({ title: '✅ Traspaso enviado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleReceive = async (id: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await receiveTransfer(id, user.id);
      invalidate();
      toast({ title: '✅ Traspaso recibido' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (!user || !cancelTarget || !cancelReason.trim()) return;
    setSaving(true);
    try {
      await cancelTransfer(cancelTarget, cancelReason, user.id);
      invalidate();
      setCancelDialogOpen(false);
      setCancelReason('');
      setCancelTarget(null);
      toast({ title: '✅ Traspaso cancelado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const filterBranch = branchFilter === 'all' ? null : branchFilter;

  const solicitudes = pending.filter(t =>
    t.status === 'solicitado' &&
    (!filterBranch || t.origin_branch === filterBranch)
  );
  const envios = pending.filter(t =>
    t.status === 'enviado' &&
    (!filterBranch || t.destination_branch === filterBranch)
  );
  const historico = allTransfers.filter(t =>
    ['recibido', 'cancelado'].includes(t.status) &&
    (!filterBranch || t.origin_branch === filterBranch || t.destination_branch === filterBranch)
  ).slice(0, 50);

  const canSend = (t: VehicleTransfer) => userBranch === t.origin_branch || isAdmin;
  const canReceive = (t: VehicleTransfer) => userBranch === t.destination_branch || isAdmin;

  const renderVehicleLink = (t: VehicleTransfer) => {
    const v = vehicleMap.get(t.vehicle_id);
    if (!v) return <span className="text-xs">{t.vehicle_id.slice(0, 8)}…</span>;
    return (
      <Link to={`/vehicles/${v.id}`} className="text-xs font-medium text-primary hover:underline">
        {v.brand} {v.model} — {v.plate}
      </Link>
    );
  };

  const renderRow = (t: VehicleTransfer, showActions = true) => (
    <TableRow key={t.id}>
      <TableCell>{renderVehicleLink(t)}</TableCell>
      <TableCell className="text-xs">{t.origin_branch}</TableCell>
      <TableCell className="text-xs">{t.destination_branch}</TableCell>
      <TableCell>
        <Badge className={cn('text-[10px] border-0', STATUS_CONFIG[t.status]?.className)}>
          {STATUS_CONFIG[t.status]?.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs">{formatDate(t.created_at)}</TableCell>
      <TableCell>
        {showActions && (
          <div className="flex gap-1">
            {t.status === 'solicitado' && canSend(t) && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSend(t.id)} disabled={saving}>
                <Send className="h-3 w-3 mr-1" /> Enviar
              </Button>
            )}
            {t.status === 'enviado' && canReceive(t) && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleReceive(t.id)} disabled={saving}>
                <PackageCheck className="h-3 w-3 mr-1" /> Recibir
              </Button>
            )}
            {['solicitado', 'enviado'].includes(t.status) && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setCancelTarget(t.id); setCancelDialogOpen(true); }} disabled={saving}>
                <Ban className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6" /> Traspasos
          </h1>
          <p className="text-sm text-muted-foreground">Gestión de traspasos de vehículos entre sucursales</p>
        </div>
        {isAdmin && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue="solicitudes">
        <TabsList>
          <TabsTrigger value="solicitudes">
            Pendientes de envío
            {solicitudes.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px]">{solicitudes.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="envios">
            Pendientes de recepción
            {envios.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px]">{envios.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitudes" className="mt-4">
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              {solicitudes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sin solicitudes pendientes de envío</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{solicitudes.map(t => renderRow(t))}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="envios" className="mt-4">
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              {envios.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sin envíos pendientes de recepción</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{envios.map(t => renderRow(t))}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Sin histórico reciente</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{historico.map(t => renderRow(t, false))}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={v => !v && setCancelDialogOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cancelar Traspaso</DialogTitle></DialogHeader>
          <div>
            <Label>Motivo de cancelación *</Label>
            <Textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Indica el motivo..."
              className="mt-1 min-h-[60px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Volver</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Cancelar Traspaso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
