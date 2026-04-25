import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createOperatingExpense } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Props { open: boolean; onClose: () => void; onSuccess: () => void; }

const CATEGORIES = [
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'nominas', label: 'Nóminas' },
  { value: 'suministros', label: 'Suministros' },
  { value: 'gestoria', label: 'Gestoría' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'otros', label: 'Otros' },
];

export function OperatingExpenseDialog({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState('otros');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('transferencia');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const amt = parseFloat(amount) || 0;
  const valid = amt > 0 && description.trim().length > 0 && date;

  const handleSubmit = async () => {
    if (!valid || !user) return;
    setSaving(true);
    try {
      await createOperatingExpense({
        category, description: description.trim(), amount: amt,
        expense_date: new Date(date).toISOString(), payment_method: method,
        notes: notes || null,
      }, user.id);
      toast({ title: 'Gasto operativo registrado' });
      onSuccess();
      onClose();
      setCategory('otros'); setDescription(''); setAmount(''); setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo gasto operativo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Descripción</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Importe (€)</Label><Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div><Label>Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
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
          <div><Label>Notas (opcional)</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
