import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface TermModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: any | null;
  products: { id: string; name: string; entity_name?: string }[];
  onSave: (data: any) => Promise<void>;
}

export function TermModelDialog({ open, onOpenChange, model, products, onSave }: TermModelDialogProps) {
  const [productId, setProductId] = useState('');
  const [tin, setTin] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [coefficient, setCoefficient] = useState('');
  const [additionalRate, setAdditionalRate] = useState('0');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setProductId(model?.product_id || (products[0]?.id || ''));
      setTin(model?.tin?.toString() || '');
      setTermMonths(model?.term_months?.toString() || '');
      setCoefficient(model?.coefficient?.toString() || '');
      setAdditionalRate(model ? ((model.additional_rate || 0) * 100).toString() : '0');
      setCommissionPercent(model?.commission_percent != null ? model.commission_percent.toString() : '');
    }
  }, [open, model, products]);

  const handleSave = async () => {
    if (!productId || !tin || !termMonths || !coefficient) return;
    setSaving(true);
    try {
      await onSave({
        product_id: productId,
        tin: parseFloat(tin),
        term_months: parseInt(termMonths),
        coefficient: parseFloat(coefficient),
        additional_rate: (parseFloat(additionalRate) || 0) / 100,
        commission_percent: commissionPercent.trim() !== '' ? parseFloat(commissionPercent) : null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const canSave = productId && parseFloat(tin) >= 0 && parseInt(termMonths) > 0 && parseFloat(coefficient) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{model ? 'Editar' : 'Nuevo'} Modelo por Plazo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Producto *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.entity_name ? `${p.entity_name} — ` : ''}{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>TIN (%) *</Label>
              <Input type="number" min="0" step="0.01" value={tin} onChange={e => setTin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Plazo (meses) *</Label>
              <Input type="number" min="1" step="1" value={termMonths} onChange={e => setTermMonths(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Coeficiente *</Label>
              <Input type="number" min="0" step="0.000001" value={coefficient} onChange={e => setCoefficient(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>% Adicional</Label>
              <Input type="number" min="0" step="0.01" value={additionalRate} onChange={e => setAdditionalRate(e.target.value)} placeholder="0" />
              <p className="text-[10px] text-muted-foreground">Mostrado como %, guardado como decimal</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Comisión (%)</Label>
              <Input type="number" min="0" step="0.01" value={commissionPercent} onChange={e => setCommissionPercent(e.target.value)} placeholder="Hereda del producto" />
              <p className="text-[10px] text-muted-foreground">Vacío = hereda comisión del producto</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {model ? 'Guardar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
