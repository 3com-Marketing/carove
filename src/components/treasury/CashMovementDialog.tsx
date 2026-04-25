import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createManualCashMovement } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CashMovementDialog({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<string>('ingreso');
  const [reason, setReason] = useState<string>('operativo');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<string>('transferencia');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  const amt = parseFloat(amount) || 0;
  const needsExtraConfirm = reason === 'ajuste' || amt > 3000;
  const valid = amt > 0 && description.trim().length >= 10 && date;

  const handleSubmit = async () => {
    if (!valid || !user) return;
    if (needsExtraConfirm && !confirmStep) {
      setConfirmStep(true);
      return;
    }
    setSaving(true);
    try {
      await createManualCashMovement({
        movement_type: type, movement_reason: reason,
        description: description.trim(), amount: amt,
        movement_date: new Date(date).toISOString(),
        payment_method: method, notes: notes || null,
      }, user.id);
      toast({ title: 'Movimiento registrado' });
      onSuccess();
      resetAndClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setType('ingreso'); setReason('operativo'); setAmount(''); setDescription(''); setNotes('');
    setDate(new Date().toISOString().split('T')[0]); setMethod('transferencia');
    setConfirmStep(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && resetAndClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{confirmStep ? 'Confirmar movimiento' : 'Registrar movimiento manual'}</DialogTitle>
        </DialogHeader>

        {confirmStep ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {reason === 'ajuste'
                  ? 'Los ajustes afectan directamente al saldo histórico. ¿Confirmar?'
                  : `Importe elevado: ${amt.toFixed(2)} €. ¿Confirmar?`}
              </AlertDescription>
            </Alert>
            <div className="text-sm space-y-1">
              <p><strong>Tipo:</strong> {type}</p>
              <p><strong>Motivo:</strong> {reason}</p>
              <p><strong>Importe:</strong> {amt.toFixed(2)} €</p>
              <p><strong>Descripción:</strong> {description}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Los movimientos manuales no se pueden borrar ni modificar en importe.</AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Motivo</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operativo">Operativo</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                    <SelectItem value="correccion">Corrección</SelectItem>
                    <SelectItem value="regularizacion">Regularización</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Importe (€)</Label>
                <Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Método de pago</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="financiado">Financiado</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Descripción (mín. 10 caracteres)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción del movimiento..." />
              {description.length > 0 && description.length < 10 && (
                <p className="text-xs text-destructive mt-1">{10 - description.length} caracteres más</p>
              )}
            </div>

            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        <DialogFooter>
          {confirmStep && <Button variant="outline" onClick={() => setConfirmStep(false)}>Volver</Button>}
          <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {confirmStep ? 'Confirmar' : needsExtraConfirm ? 'Continuar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
