import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSuppliers } from '@/lib/supabase-api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone } from 'lucide-react';
import type { Expense } from '@/lib/types';

interface ExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Expense>) => void;
  expense?: Expense | null;
  saving?: boolean;
}

export function ExpenseDialog({ open, onClose, onSave, expense, saving }: ExpenseDialogProps) {
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
    enabled: open,
  });

  const [form, setForm] = useState({
    date: '', completion_date: '', supplier_name: '', supplier_id: '',
    invoice_number: '', amount: '', description: '', observations: '',
    courtesy_vehicle_plate: '', courtesy_delivery_date: '', courtesy_return_date: '',
  });

  const [supplierPhone, setSupplierPhone] = useState('');

  useEffect(() => {
    if (expense) {
      setForm({
        date: expense.date ? expense.date.slice(0, 10) : '',
        completion_date: expense.completion_date ? expense.completion_date.slice(0, 10) : '',
        supplier_name: expense.supplier_name || '',
        supplier_id: expense.supplier_id || '',
        invoice_number: expense.invoice_number || '',
        amount: String(expense.amount || ''),
        description: expense.description || '',
        observations: expense.observations || '',
        courtesy_vehicle_plate: expense.courtesy_vehicle_plate || '',
        courtesy_delivery_date: expense.courtesy_delivery_date ? expense.courtesy_delivery_date.slice(0, 10) : '',
        courtesy_return_date: expense.courtesy_return_date ? expense.courtesy_return_date.slice(0, 10) : '',
      });
      // Set phone for existing supplier
      if (expense.supplier_id) {
        const s = suppliers.find(s => s.id === expense.supplier_id);
        setSupplierPhone(s?.phone || '');
      }
    } else {
      setForm({
        date: new Date().toISOString().slice(0, 10), completion_date: '',
        supplier_name: '', supplier_id: '', invoice_number: '', amount: '',
        description: '', observations: '',
        courtesy_vehicle_plate: '', courtesy_delivery_date: '', courtesy_return_date: '',
      });
      setSupplierPhone('');
    }
  }, [expense, open]);

  // Update phone when suppliers load
  useEffect(() => {
    if (form.supplier_id && suppliers.length > 0) {
      const s = suppliers.find(s => s.id === form.supplier_id);
      if (s) setSupplierPhone(s.phone || '');
    }
  }, [suppliers, form.supplier_id]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSupplierSelect = (supplierId: string) => {
    if (supplierId === '_manual') {
      set('supplier_id', '');
      set('supplier_name', '');
      setSupplierPhone('');
      return;
    }
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      set('supplier_id', supplier.id);
      set('supplier_name', supplier.name);
      setSupplierPhone(supplier.phone || '');
    }
  };

  const activeSuppliers = suppliers.filter(s => s.active);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{expense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Fecha</Label><Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Finalización</Label><Input type="date" value={form.completion_date} onChange={e => set('completion_date', e.target.value)} className="h-8 text-xs" /></div>
          </div>
          <div>
            <Label className="text-xs">Acreedor / Taller</Label>
            <Select value={form.supplier_id || '_manual'} onValueChange={handleSupplierSelect}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar proveedor..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_manual">— Introducir manualmente —</SelectItem>
                {activeSuppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.specialty ? ` (${s.specialty})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!form.supplier_id && (
            <div><Label className="text-xs">Nombre acreedor</Label><Input value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} className="h-8 text-xs" placeholder="Nombre del acreedor..." /></div>
          )}
          {supplierPhone && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-xs">
              <Phone className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-muted-foreground">Teléfono:</span>
              <a href={`tel:${supplierPhone}`} className="font-medium text-foreground hover:underline">{supplierPhone}</a>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Nº Factura</Label><Input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Importe (€)</Label><Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className="h-8 text-xs" /></div>
          </div>
          <div><Label className="text-xs">Descripción</Label><Input value={form.description} onChange={e => set('description', e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Observaciones</Label><Textarea value={form.observations} onChange={e => set('observations', e.target.value)} className="text-xs min-h-[60px]" /></div>
          
          {/* Vehículo de cortesía */}
          <div className="border-t pt-3 mt-1">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Vehículo de Cortesía (opcional)</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Matrícula cortesía</Label><Input value={form.courtesy_vehicle_plate} onChange={e => set('courtesy_vehicle_plate', e.target.value)} placeholder="0000 ABC" className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Entrega</Label><Input type="date" value={form.courtesy_delivery_date} onChange={e => set('courtesy_delivery_date', e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-xs">Devolución</Label><Input type="date" value={form.courtesy_return_date} onChange={e => set('courtesy_return_date', e.target.value)} className="h-8 text-xs" /></div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancelar</Button>
          <Button size="sm" disabled={saving} onClick={() => onSave({
            date: form.date || new Date().toISOString(),
            completion_date: form.completion_date || null,
            supplier_name: form.supplier_name,
            supplier_id: form.supplier_id || undefined,
            invoice_number: form.invoice_number,
            amount: Number(form.amount) || 0,
            description: form.description,
            observations: form.observations,
            courtesy_vehicle_plate: form.courtesy_vehicle_plate || null,
            courtesy_delivery_date: form.courtesy_delivery_date || null,
            courtesy_return_date: form.courtesy_return_date || null,
          } as Partial<Expense>)}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
