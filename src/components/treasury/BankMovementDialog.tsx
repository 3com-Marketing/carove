import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createBankMovement } from '@/lib/supabase-api';
import { toast } from '@/hooks/use-toast';
import type { BankAccount } from '@/lib/types';

interface Props { open: boolean; onClose: () => void; onSuccess: () => void; accounts: BankAccount[]; }

export function BankMovementDialog({ open, onClose, onSuccess, accounts }: Props) {
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('ingreso');
  const [saving, setSaving] = useState(false);

  const amt = parseFloat(amount) || 0;
  const valid = accountId && amt > 0 && description.trim() && date;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await createBankMovement({ bank_account_id: accountId, movement_date: new Date(date).toISOString(), description: description.trim(), amount: amt, movement_type: type });
      toast({ title: 'Movimiento bancario registrado' });
      onSuccess(); onClose();
      setAccountId(''); setDescription(''); setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo movimiento bancario</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Cuenta</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
              <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.bank_name} - {a.account_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                  <SelectItem value="gasto">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Importe (€)</Label><Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          </div>
          <div><Label>Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><Label>Descripción</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
