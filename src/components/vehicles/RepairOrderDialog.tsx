import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { Supplier } from '@/lib/types';
import type { RepairOrderCategoryType } from '@/lib/types';

const CATEGORY_LABELS: Record<RepairOrderCategoryType, string> = {
  mecanica: 'Mecánica',
  chapa_pintura: 'Chapa y Pintura',
  electricidad: 'Electricidad',
  estetica: 'Estética',
  revision_preventa: 'Revisión Pre-venta',
  detailing: 'Detailing',
  otros: 'Otros',
};

interface CategoryDraft {
  category_type: RepairOrderCategoryType;
  estimated_amount: number;
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { supplier_id: string; estimated_end_date?: string; observations?: string; categories: CategoryDraft[] }) => Promise<void>;
  suppliers: Supplier[];
}

export function RepairOrderDialog({ open, onClose, onSave, suppliers }: Props) {
  const [supplierId, setSupplierId] = useState('');
  const [endDate, setEndDate] = useState('');
  const [observations, setObservations] = useState('');
  const [categories, setCategories] = useState<CategoryDraft[]>([{ category_type: 'mecanica', estimated_amount: 0, description: '' }]);
  const [saving, setSaving] = useState(false);

  const addCategory = () => setCategories(p => [...p, { category_type: 'otros', estimated_amount: 0, description: '' }]);
  const removeCategory = (i: number) => setCategories(p => p.filter((_, idx) => idx !== i));
  const updateCategory = (i: number, field: string, value: any) => setCategories(p => p.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

  const handleSave = async () => {
    if (!supplierId || categories.length === 0) return;
    setSaving(true);
    try {
      await onSave({ supplier_id: supplierId, estimated_end_date: endDate || undefined, observations, categories });
      setSupplierId(''); setEndDate(''); setObservations('');
      setCategories([{ category_type: 'mecanica', estimated_amount: 0, description: '' }]);
    } finally { setSaving(false); }
  };

  const activeSuppliers = suppliers.filter(s => s.active);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva Orden de Reparación</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Taller / Proveedor *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
              <SelectContent>
                {activeSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha prevista finalización</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="mb-0">Categorías *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCategory}><Plus className="h-3 w-3 mr-1" /> Añadir</Button>
            </div>
            <div className="space-y-2">
              {categories.map((cat, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Select value={cat.category_type} onValueChange={v => updateCategory(i, 'category_type', v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Importe" className="w-24" value={cat.estimated_amount || ''} onChange={e => updateCategory(i, 'estimated_amount', Number(e.target.value))} />
                  <Input placeholder="Descripción" className="flex-1" value={cat.description} onChange={e => updateCategory(i, 'description', e.target.value)} />
                  {categories.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeCategory(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !supplierId || categories.length === 0}>{saving ? 'Creando...' : 'Crear Orden'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
