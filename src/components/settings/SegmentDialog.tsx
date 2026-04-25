import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { VehicleSegment } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment?: VehicleSegment | null;
  onSave: (data: Partial<VehicleSegment>) => void;
  loading?: boolean;
}

export function SegmentDialog({ open, onOpenChange, segment, onSave, loading }: Props) {
  const [form, setForm] = useState({ code: '', name: '', description: '', size_range: '', examples: '', active: true });

  useEffect(() => {
    if (segment) {
      setForm({ code: segment.code, name: segment.name, description: segment.description, size_range: segment.size_range, examples: segment.examples, active: segment.active });
    } else {
      setForm({ code: '', name: '', description: '', size_range: '', examples: '', active: true });
    }
  }, [segment, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{segment ? 'Editar Segmento' : 'Nuevo Segmento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required disabled={!!segment} />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rango de tamaño</Label>
              <Input value={form.size_range} onChange={e => setForm(f => ({ ...f, size_range: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ejemplos</Label>
              <Input value={form.examples} onChange={e => setForm(f => ({ ...f, examples: e.target.value }))} />
            </div>
          </div>
          {segment && (
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Activo</Label>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
