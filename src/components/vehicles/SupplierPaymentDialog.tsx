import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/constants';
import type { BankAccount } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { amount: number; payment_date: string; payment_method: string; bank_account_id?: string; notes?: string }) => Promise<void>;
  pendingAmount: number;
  bankAccounts: BankAccount[];
}

export function SupplierPaymentDialog({ open, onClose, onSave, pendingAmount, bankAccounts }: Props) {
  const [amount, setAmount] = useState<number>(pendingAmount);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [bankAccountId, setBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (amount <= 0 || amount > pendingAmount + 0.01) return;
    setSaving(true);
    try {
      await onSave({ amount, payment_date: paymentDate, payment_method: paymentMethod, bank_account_id: bankAccountId || undefined, notes: notes || undefined });
      setAmount(0); setNotes('');
    } finally { setSaving(false); }
  };

  const activeAccounts = bankAccounts.filter(a => a.is_active);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Registrar Pago a Proveedor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <span>Saldo pendiente: </span><span className="font-semibold">{formatCurrency(pendingAmount)}</span>
          </div>
          <div>
            <Label>Importe *</Label>
            <Input type="number" step="0.01" max={pendingAmount} value={amount || ''} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>Fecha *</Label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <Label>Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {activeAccounts.length > 0 && (
            <div>
              <Label>Cuenta bancaria</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {activeAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.bank_name} - {a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          {amount > pendingAmount + 0.01 && <p className="text-xs text-destructive">El importe supera el saldo pendiente</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || amount <= 0 || amount > pendingAmount + 0.01}>{saving ? 'Registrando...' : 'Registrar Pago'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
