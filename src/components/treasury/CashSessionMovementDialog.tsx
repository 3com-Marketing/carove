import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createCashSessionMovement, getCashCategories } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { CashCategory } from '@/lib/types';

interface Props {
  open: boolean;
  sessionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CashSessionMovementDialog({ open, sessionId, onClose, onSuccess }: Props) {
  const { user, profile } = useAuth();
  const [type, setType] = useState<string>('ingreso');
  const [method, setMethod] = useState<string>('efectivo');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      getCashCategories(undefined, true).then(setCategories).catch(() => {});
    }
  }, [open]);

  const filteredCategories = categories.filter(c => c.category_type === type);
  const selectedCat = categories.find(c => c.id === categoryId);

  // Reset category when type changes and current selection doesn't match
  useEffect(() => {
    if (selectedCat && selectedCat.category_type !== type) {
      setCategoryId('');
    }
  }, [type, selectedCat]);

  const amt = parseFloat(amount) || 0;
  const valid = amt > 0 && concept.trim().length >= 3 && categoryId;

  const handleSubmit = async () => {
    if (!valid || !user) return;
    setSaving(true);
    try {
      await createCashSessionMovement({
        session_id: sessionId,
        movement_type: type,
        payment_method: method,
        category: selectedCat?.name || 'general',
        category_id: categoryId,
        concept: concept.trim(),
        amount: amt,
        notes: notes || null,
        created_by: user.id,
        created_by_name: profile?.full_name || user.email || '',
      });
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
    setType('ingreso');
    setMethod('efectivo');
    setCategoryId('');
    setConcept('');
    setAmount('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && resetAndClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimiento de caja</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                  <SelectItem value="gasto">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Método de pago *</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tpv">TPV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Categoría *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
              <SelectContent>
                {filteredCategories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Concepto * (mín. 3 caracteres)</Label>
            <Input value={concept} onChange={e => setConcept(e.target.value)} placeholder="Descripción del movimiento..." />
          </div>

          <div>
            <Label>Importe (€) *</Label>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div>
            <Label>Observaciones (opcional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? 'Guardando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}