import { useState } from 'react';
import { createPayment } from '@/lib/supabase-api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/constants';

interface Props {
  type: 'factura' | 'reserva';
  referenceId: string;
  vehicleId: string;
  buyerId: string;
  totalAmount: number;
  pendingAmount: number;
  isCobrada?: boolean;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'financiado', label: 'Financiado' },
  { value: 'otro', label: 'Otro' },
];

export function PaymentDialog({ type, referenceId, vehicleId, buyerId, totalAmount, pendingAmount, isCobrada, open, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [amount, setAmount] = useState(isCobrada ? '' : pendingAmount > 0 ? pendingAmount.toFixed(2) : '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('efectivo');
  const [isRefund, setIsRefund] = useState(isCobrada ? true : false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const exceedsPending = !isRefund && numAmount > pendingAmount + 0.01 && pendingAmount > 0;

  const handleSave = async () => {
    if (!user || numAmount <= 0) return;
    setSaving(true);
    try {
      await createPayment({
        payment_type: type,
        invoice_id: type === 'factura' ? referenceId : null,
        reservation_id: type === 'reserva' ? referenceId : null,
        vehicle_id: vehicleId,
        buyer_id: buyerId,
        amount: numAmount,
        payment_date: new Date(paymentDate).toISOString(),
        payment_method: method,
        is_refund: isRefund,
        notes: notes || null,
      }, user.id);
      toast({ title: `✅ ${isRefund ? 'Devolución' : 'Pago'} registrado: ${formatCurrency(numAmount)}` });
      onSuccess();
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isRefund ? 'Registrar devolución' : 'Registrar pago'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isCobrada && !isRefund && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Esta factura ya está cobrada. Solo se permiten devoluciones.</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Importe (€)</Label>
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
          </div>

          {exceedsPending && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 text-xs">
                El importe ({formatCurrency(numAmount)}) supera el pendiente ({formatCurrency(pendingAmount)}).
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Método de pago</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="is-refund" checked={isRefund} onCheckedChange={v => setIsRefund(v === true)} disabled={isCobrada} />
            <label htmlFor="is-refund" className="text-sm">Es devolución</label>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas internas..." />
          </div>

          {type === 'factura' && (
            <div className="rounded-lg border p-3 bg-muted/30 text-xs space-y-0.5">
              <p><span className="text-muted-foreground">Total factura:</span> <strong>{formatCurrency(totalAmount)}</strong></p>
              <p><span className="text-muted-foreground">Pendiente:</span> <strong>{formatCurrency(pendingAmount)}</strong></p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || numAmount <= 0 || (isCobrada && !isRefund)}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isRefund ? 'Registrar devolución' : 'Registrar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
