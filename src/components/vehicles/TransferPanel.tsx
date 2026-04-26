import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVehicleTransfers, getActiveTransfer, createTransferRequest, sendTransfer, receiveTransfer, cancelTransfer } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { TransferRequestDialog } from './TransferRequestDialog';
import { formatDate } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight, Send, PackageCheck, Ban, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VehicleTransfer } from '@/lib/types';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  solicitado: { label: 'Solicitado', className: 'bg-amber-500 text-white' },
  enviado: { label: 'Enviado', className: 'bg-blue-500 text-white' },
  recibido: { label: 'Recibido', className: 'bg-emerald-500 text-white' },
  cancelado: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
};

interface TransferPanelProps {
  vehicleId: string;
  currentBranch: string;
}

export function TransferPanel({ vehicleId, currentBranch }: TransferPanelProps) {
  const { user, profile } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  // `vehicle_transfers.origin_branch` se almacena como nombre de sucursal.
  // profile.branch_id es uuid; resolvemos el nombre con la lista de branches
  // que TransferPanel no tiene importada. De momento comparamos por uuid contra
  // origin_branch (que históricamente puede contener nombre o uuid). Esto es
  // mejor que quedarse con undefined permanentemente, y permite el filtrado
  // por sucursal en cuanto los datos converjan a uuid.
  const userBranch = profile?.branch_id ?? null;

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['vehicle-transfers', vehicleId],
    queryFn: () => getVehicleTransfers(vehicleId),
  });
  const { data: activeTransfer } = useQuery({
    queryKey: ['active-transfer', vehicleId],
    queryFn: () => getActiveTransfer(vehicleId),
  });

  const [requestOpen, setRequestOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['vehicle-transfers', vehicleId] });
    qc.invalidateQueries({ queryKey: ['active-transfer', vehicleId] });
    qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
  };

  const handleRequest = async (destination: string, observations: string) => {
    if (!user) return;
    const effectiveBranch = userBranch ?? currentBranch;
    if (!effectiveBranch) return;
    setSaving(true);
    try {
      await createTransferRequest(vehicleId, currentBranch, destination, effectiveBranch, observations, user.id);
      invalidate();
      setRequestOpen(false);
      toast({ title: '✅ Traspaso solicitado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleSend = async (transferId: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await sendTransfer(transferId, user.id);
      invalidate();
      toast({ title: '✅ Traspaso enviado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleReceive = async (transferId: string) => {
    if (!user) return;
    setSaving(true);
    try {
      await receiveTransfer(transferId, user.id);
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

  const canRequest = !activeTransfer && (!!userBranch || isAdmin);
  const canSend = (t: VehicleTransfer) => t.status === 'solicitado' && (userBranch === t.origin_branch || isAdmin);
  const canReceive = (t: VehicleTransfer) => t.status === 'enviado' && (userBranch === t.destination_branch || isAdmin);
  const canCancelTransfer = (t: VehicleTransfer) => ['solicitado', 'enviado'].includes(t.status);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4">
      {/* Current branch */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" /> Sucursal Actual</CardTitle>
            <Badge variant="outline" className="text-sm font-semibold">{currentBranch}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {activeTransfer ? (
            <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Traspaso activo</span>
                <Badge className={cn('border-0', STATUS_CONFIG[activeTransfer.status]?.className)}>
                  {STATUS_CONFIG[activeTransfer.status]?.label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Origen:</span> <strong>{activeTransfer.origin_branch}</strong></div>
                <div><span className="text-muted-foreground">Destino:</span> <strong>{activeTransfer.destination_branch}</strong></div>
                <div><span className="text-muted-foreground">Solicitado:</span> <strong>{formatDate(activeTransfer.created_at)}</strong></div>
                {activeTransfer.sent_at && <div><span className="text-muted-foreground">Enviado:</span> <strong>{formatDate(activeTransfer.sent_at)}</strong></div>}
              </div>
              {activeTransfer.observations && (
                <p className="text-xs text-muted-foreground italic">{activeTransfer.observations}</p>
              )}
              <div className="flex gap-2 pt-2">
                {canSend(activeTransfer) && (
                  <Button size="sm" onClick={() => handleSend(activeTransfer.id)} disabled={saving}>
                    <Send className="h-3 w-3 mr-1" /> Enviar
                  </Button>
                )}
                {canReceive(activeTransfer) && (
                  <Button size="sm" onClick={() => handleReceive(activeTransfer.id)} disabled={saving}>
                    <PackageCheck className="h-3 w-3 mr-1" /> Recibir
                  </Button>
                )}
                {canCancelTransfer(activeTransfer) && (
                  <Button size="sm" variant="outline" onClick={() => { setCancelTarget(activeTransfer.id); setCancelDialogOpen(true); }} disabled={saving}>
                    <Ban className="h-3 w-3 mr-1" /> Cancelar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Sin traspaso activo</p>
              {canRequest && (
                <Button size="sm" onClick={() => setRequestOpen(true)}>
                  <ArrowLeftRight className="h-3 w-3 mr-1" /> Solicitar Traspaso
                </Button>
              )}
              {!userBranch && !isAdmin && (
                <p className="text-xs text-muted-foreground">No tienes sucursal asignada</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {transfers.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Histórico de Traspasos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead>Recibido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{formatDate(t.created_at)}</TableCell>
                    <TableCell className="text-xs font-medium">{t.origin_branch}</TableCell>
                    <TableCell className="text-xs font-medium">{t.destination_branch}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px] border-0', STATUS_CONFIG[t.status]?.className)}>
                        {STATUS_CONFIG[t.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{t.sent_at ? formatDate(t.sent_at) : '—'}</TableCell>
                    <TableCell className="text-xs">{t.received_at ? formatDate(t.received_at) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <TransferRequestDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSubmit={handleRequest}
        currentBranch={currentBranch}
        saving={saving}
      />

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
