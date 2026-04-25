import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: string;
  scope: 'global' | 'role' | 'individual';
  targetUserId?: string;
  targetRole?: string;
  existing?: any;
  onSaved: () => void;
}

export function ObjectiveDialog({ open, onOpenChange, period, scope, targetUserId, targetRole, existing, onSaved }: ObjectiveDialogProps) {
  const { user } = useAuth();
  const [targetSales, setTargetSales] = useState(0);
  const [targetMargin, setTargetMargin] = useState(0);
  const [targetFinanced, setTargetFinanced] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setTargetSales(existing.target_sales || 0);
      setTargetMargin(existing.target_margin || 0);
      setTargetFinanced(existing.target_financed || 0);
    } else {
      setTargetSales(0);
      setTargetMargin(0);
      setTargetFinanced(0);
    }
  }, [existing, open]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data = {
        period,
        scope,
        target_user_id: scope === 'individual' ? targetUserId : null,
        target_role: scope === 'role' ? targetRole : null,
        target_sales: targetSales,
        target_margin: targetMargin,
        target_financed: targetFinanced,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        // Log changes
        const fields = [
          { name: 'target_sales', old: existing.target_sales, new: targetSales },
          { name: 'target_margin', old: existing.target_margin, new: targetMargin },
          { name: 'target_financed', old: existing.target_financed, new: targetFinanced },
        ];
        const changes = fields.filter(f => String(f.old) !== String(f.new));

        if (changes.length > 0) {
          await supabase.from('objective_change_log').insert(
            changes.map(c => ({
              objective_id: existing.id,
              changed_by: user.id,
              field_name: c.name,
              old_value: String(c.old),
              new_value: String(c.new),
            }))
          );
        }

        const { error } = await supabase.from('sales_objectives').update({
          target_sales: targetSales,
          target_margin: targetMargin,
          target_financed: targetFinanced,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sales_objectives').insert(data as any);
        if (error) throw error;
      }

      toast.success('Objetivo guardado');
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
          <DialogTitle>{existing ? 'Editar' : 'Crear'} Objetivo — {period}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Objetivo ventas (uds)</Label>
            <Input type="number" min={0} value={targetSales} onChange={e => setTargetSales(Number(e.target.value))} />
          </div>
          <div>
            <Label>Objetivo margen (€)</Label>
            <Input type="number" min={0} value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} />
          </div>
          <div>
            <Label>Objetivo financiaciones (uds)</Label>
            <Input type="number" min={0} value={targetFinanced} onChange={e => setTargetFinanced(Number(e.target.value))} />
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
