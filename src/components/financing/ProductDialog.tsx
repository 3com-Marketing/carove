import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: { id: string; name: string; entity_id: string; commission_percent?: number } | null;
  entities: { id: string; name: string }[];
  onSave: (data: { name: string; entity_id: string; commission_percent: number }) => Promise<void>;
  defaultEntityId?: string;
}

export function ProductDialog({ open, onOpenChange, product, entities, onSave, defaultEntityId }: ProductDialogProps) {
  const [name, setName] = useState('');
  const [entityId, setEntityId] = useState('');
  const [commissionPercent, setCommissionPercent] = useState(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(product?.name || '');
      setEntityId(product?.entity_id || defaultEntityId || (entities[0]?.id || ''));
      setCommissionPercent(product?.commission_percent ?? 2);
    }
  }, [open, product, entities]);

  const handleSave = async () => {
    if (!name.trim() || !entityId) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), entity_id: entityId, commission_percent: commissionPercent });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar' : 'Nuevo'} Producto Financiero</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Entidad *</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar entidad" /></SelectTrigger>
              <SelectContent>
                {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Préstamo personal" />
          </div>
          <div className="space-y-1.5">
            <Label>Comisión (%)</Label>
            <Input type="number" step="0.01" min={0} max={100} value={commissionPercent} onChange={e => setCommissionPercent(Number(e.target.value))} placeholder="2.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !entityId || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {product ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
