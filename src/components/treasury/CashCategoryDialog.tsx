import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { createCashCategory, updateCashCategory } from '@/lib/supabase-api';
import type { CashCategory } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  category: CashCategory | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CashCategoryDialog({ open, category, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'ingreso' | 'gasto'>('ingreso');
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setType(category.category_type);
      setSortOrder(category.sort_order);
      setActive(category.active);
    } else {
      setName('');
      setType('ingreso');
      setSortOrder(0);
      setActive(true);
    }
  }, [category, open]);

  const valid = name.trim().length >= 2;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      if (category) {
        await updateCashCategory(category.id, { name: name.trim(), active, sort_order: sortOrder });
      } else {
        await createCashCategory(name.trim(), type, sortOrder);
      }
      toast({ title: category ? 'Categoría actualizada' : 'Categoría creada' });
      onSuccess();
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
          <DialogTitle>{category ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la categoría" />
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={v => setType(v as any)} disabled={!!category}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="gasto">Gasto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Orden</Label>
            <Input type="number" min={0} value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
          </div>
          {category && (
            <div className="flex items-center gap-3">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>{active ? 'Activa' : 'Inactiva'}</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>
            {saving ? 'Guardando...' : category ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
