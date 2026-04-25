import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBankAccount } from '@/lib/supabase-api';
import { toast } from '@/hooks/use-toast';

interface Props { open: boolean; onClose: () => void; onSuccess: () => void; }

export function BankAccountDialog({ open, onClose, onSuccess }: Props) {
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [saving, setSaving] = useState(false);

  const valid = bankName.trim() && accountName.trim() && iban.trim();

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await createBankAccount({ bank_name: bankName.trim(), account_name: accountName.trim(), iban: iban.trim(), initial_balance: parseFloat(initialBalance) || 0 });
      toast({ title: 'Cuenta bancaria creada' });
      onSuccess(); onClose();
      setBankName(''); setAccountName(''); setIban(''); setInitialBalance('0');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva cuenta bancaria</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Banco</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} /></div>
          <div><Label>Nombre de cuenta</Label><Input value={accountName} onChange={e => setAccountName(e.target.value)} /></div>
          <div><Label>IBAN</Label><Input value={iban} onChange={e => setIban(e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" /></div>
          <div><Label>Saldo inicial (€)</Label><Input type="number" step="0.01" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
