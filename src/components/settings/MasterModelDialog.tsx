import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BODY_TYPES } from '@/lib/constants';
import type { MasterModel, MasterBrand, VehicleSegment } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: MasterModel | null;
  brands: MasterBrand[];
  segments: VehicleSegment[];
  onSave: (data: { brand_id: string; name: string; body_type: string; segment_id: string; active: boolean }) => void;
  loading?: boolean;
}

export function MasterModelDialog({ open, onOpenChange, model, brands, segments, onSave, loading }: Props) {
  const [form, setForm] = useState({ brand_id: '', name: '', body_type: '', segment_id: '', active: true });

  useEffect(() => {
    if (model) {
      setForm({ brand_id: model.brand_id, name: model.name, body_type: model.body_type, segment_id: model.segment_id, active: model.active });
    } else {
      setForm({ brand_id: '', name: '', body_type: '', segment_id: '', active: true });
    }
  }, [model, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const activeBrands = brands.filter(b => b.active);
  const activeSegments = segments.filter(s => s.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{model ? 'Editar Modelo Maestro' : 'Nuevo Modelo Maestro'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select value={form.brand_id} onValueChange={v => setForm(f => ({ ...f, brand_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar marca" /></SelectTrigger>
              <SelectContent>
                {activeBrands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nombre del modelo</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Carrocería</Label>
              <Select value={form.body_type} onValueChange={v => setForm(f => ({ ...f, body_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {BODY_TYPES.map(bt => <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Segmento</Label>
              <Select value={form.segment_id} onValueChange={v => setForm(f => ({ ...f, segment_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {activeSegments.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {model && (
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Activo</Label>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !form.brand_id || !form.body_type || !form.segment_id}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
