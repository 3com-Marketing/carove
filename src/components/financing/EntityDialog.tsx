import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface EntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity?: { id: string; name: string } | null;
  onSave: (name: string) => Promise<void>;
}

export function EntityDialog({ open, onOpenChange, entity, onSave }: EntityDialogProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(entity?.name || '');
  }, [open, entity]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{entity ? 'Editar' : 'Nueva'} Entidad Financiera</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Banco Santander" autoFocus />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {entity ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
