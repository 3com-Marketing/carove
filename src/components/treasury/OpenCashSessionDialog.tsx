import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { openCashSession } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OpenCashSessionDialog({ open, onClose, onSuccess }: Props) {
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const amt = parseFloat(balance) || 0;
  const valid = amt >= 0 && balance.trim() !== '';

  const handleSubmit = async () => {
    if (!valid || !user) return;
    setSaving(true);
    try {
      await openCashSession(amt, notes || null, user.id, profile?.full_name || user.email || '');
      toast({ title: 'Caja abierta correctamente' });
      onSuccess();
      setBalance('');
      setNotes('');
      onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir caja del día</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Saldo inicial (€) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Notas (opcional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observaciones de apertura..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? 'Abriendo...' : 'Abrir caja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
