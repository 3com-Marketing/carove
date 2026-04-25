import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: any;
  defaultCategory?: string;
  onSaved: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  ventas: 'Ventas (uds)',
  margen: 'Margen (€)',
  financiacion: 'Financiación (uds)',
};

export function TierDialog({ open, onOpenChange, existing, defaultCategory, onSaved }: TierDialogProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState(defaultCategory || 'ventas');
  const [threshold, setThreshold] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setCategory(existing.category);
      setThreshold(existing.threshold);
      setBonusAmount(existing.bonus_amount);
    } else {
      setCategory(defaultCategory || 'ventas');
      setThreshold(0);
      setBonusAmount(0);
    }
  }, [existing, open, defaultCategory]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (existing?.id) {
        const { error } = await supabase.from('incentive_tiers').update({
          category,
          threshold,
          bonus_amount: bonusAmount,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('incentive_tiers').insert({
          category,
          threshold,
          bonus_amount: bonusAmount,
          created_by: user.id,
        } as any);
        if (error) throw error;
      }
      toast.success('Escalón guardado');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Editar' : 'Nuevo'} escalón de incentivo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Categoría</Label>
            <Select value={category} onValueChange={setCategory} disabled={!!existing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Umbral ({category === 'margen' ? '€' : 'uds'})</Label>
            <Input type="number" min={0} value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
          </div>
          <div>
            <Label>Bonus (€)</Label>
            <Input type="number" min={0} value={bonusAmount} onChange={e => setBonusAmount(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
