import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const ACTIONS = [
  { value: 'venta', label: 'Venta de vehículo' },
  { value: 'financiacion', label: 'Operación financiada' },
  { value: 'producto_adicional', label: 'Producto adicional' },
  { value: 'margen_superior', label: 'Margen superior a umbral' },
];

interface PointRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: any;
  onSaved: () => void;
}

export function PointRuleDialog({ open, onOpenChange, existing, onSaved }: PointRuleDialogProps) {
  const { user } = useAuth();
  const [action, setAction] = useState('venta');
  const [points, setPoints] = useState(10);
  const [threshold, setThreshold] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setAction(existing.action);
      setPoints(existing.points);
      setThreshold(existing.threshold);
    } else {
      setAction('venta');
      setPoints(10);
      setThreshold(0);
    }
  }, [existing, open]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      action,
      points,
      threshold,
      created_by: user?.id || '',
    };

    let error;
    if (existing) {
      ({ error } = await supabase.from('point_rules').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('point_rules').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(existing ? 'Regla actualizada' : 'Regla creada');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Editar regla' : 'Nueva regla de puntos'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Acción</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Puntos</Label>
            <Input type="number" min={0} value={points} onChange={e => setPoints(Number(e.target.value))} />
          </div>
          {action === 'margen_superior' && (
            <div>
              <Label>Umbral de margen (€)</Label>
              <Input type="number" min={0} value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
