import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoiceSeries, createInvoiceFromSale, getPaymentsByReservation, getActiveReservationByVehicle } from '@/lib/supabase-api';
import { formatCurrency } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import type { Sale } from '@/lib/types';

interface Props {
  sale: Sale;
  buyerName: string;
  vehicleInfo: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceDialog({ sale, buyerName, vehicleInfo, open, onClose, onSuccess }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { data: series = [] } = useQuery({ queryKey: ['invoice-series'], queryFn: getInvoiceSeries });

  // Check for reservation signal payments
  const { data: activeReservation } = useQuery({
    queryKey: ['active-reservation', sale.vehicle_id],
    queryFn: () => getActiveReservationByVehicle(sale.vehicle_id),
    enabled: !!sale.vehicle_id,
  });
  const { data: reservationPayments = [] } = useQuery({
    queryKey: ['payments-reservation', activeReservation?.id],
    queryFn: () => getPaymentsByReservation(activeReservation!.id),
    enabled: !!activeReservation?.id,
  });

  const signalNet = reservationPayments.length > 0
    ? reservationPayments.filter(p => !p.is_refund).reduce((s, p) => s + p.amount, 0) - reservationPayments.filter(p => p.is_refund).reduce((s, p) => s + p.amount, 0)
    : 0;

  const defaultSeries = series.find(s => s.is_default && s.active && !s.is_rectificativa);
  const [seriesId, setSeriesId] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedSeries = seriesId || defaultSeries?.id || '';
  const activeSeries = series.filter(s => s.active && !s.is_rectificativa);

  const handleEmit = async () => {
    if (!user || !selectedSeries) return;
    setSaving(true);
    try {
      const invoice = await createInvoiceFromSale(sale.id, selectedSeries, user.id, profile?.full_name || user.email || '');
      toast({ title: `✅ Factura ${invoice.full_number} emitida` });
      onSuccess();
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Emitir Factura</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/30 text-sm space-y-1">
            <p><span className="text-muted-foreground">Cliente:</span> <strong>{buyerName}</strong></p>
            <p><span className="text-muted-foreground">Vehículo:</span> {vehicleInfo}</p>
            <p><span className="text-muted-foreground">Base imponible:</span> {formatCurrency(sale.base_amount)}</p>
            <p><span className="text-muted-foreground">{sale.tax_type.toUpperCase()} ({sale.tax_rate}%):</span> {formatCurrency(sale.tax_amount)}</p>
            <p className="font-semibold"><span className="text-muted-foreground">Total:</span> {formatCurrency(sale.total_amount)}</p>
          </div>

          {signalNet > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 text-sm">
                Existe una señal registrada de <strong>{formatCurrency(signalNet)}</strong>. Podrá aplicarse como pago una vez emitida la factura.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Serie de facturación</Label>
            <Select value={selectedSeries} onValueChange={setSeriesId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar serie" /></SelectTrigger>
              <SelectContent>
                {activeSeries.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.prefix}-{s.year}) {s.is_default ? '— Por defecto' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleEmit} disabled={saving || !selectedSeries}>
            {saving ? 'Emitiendo...' : 'Emitir factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
