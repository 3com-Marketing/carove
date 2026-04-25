import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: any;
  onSaved: () => void;
}

export function LevelDialog({ open, onOpenChange, existing, onSaved }: LevelDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [minPoints, setMinPoints] = useState(0);
  const [bonusMultiplier, setBonusMultiplier] = useState(1);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setMinPoints(existing.min_points);
      setBonusMultiplier(existing.bonus_multiplier);
      setSortOrder(existing.sort_order);
    } else {
      setName('');
      setMinPoints(0);
      setBonusMultiplier(1);
      setSortOrder(0);
    }
  }, [existing, open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      min_points: minPoints,
      bonus_multiplier: bonusMultiplier,
      sort_order: sortOrder,
      created_by: user?.id || '',
    };

    let error;
    if (existing) {
      ({ error } = await supabase.from('commercial_levels').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('commercial_levels').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(existing ? 'Nivel actualizado' : 'Nivel creado');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Editar nivel' : 'Nuevo nivel comercial'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Oro" />
          </div>
          <div>
            <Label>Puntos mínimos</Label>
            <Input type="number" min={0} value={minPoints} onChange={e => setMinPoints(Number(e.target.value))} />
          </div>
          <div>
            <Label>Multiplicador de bonus</Label>
            <Input type="number" min={0} step={0.1} value={bonusMultiplier} onChange={e => setBonusMultiplier(Number(e.target.value))} />
          </div>
          <div>
            <Label>Orden</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
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
