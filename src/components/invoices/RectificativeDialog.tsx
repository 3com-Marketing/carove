import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInvoiceSeries, createRectificativeInvoice } from '@/lib/supabase-api';
import { formatCurrency } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Invoice } from '@/lib/types';

interface Props {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RectificativeDialog({ invoice, open, onClose, onSuccess }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { data: series = [] } = useQuery({ queryKey: ['invoice-series'], queryFn: getInvoiceSeries });

  const rectSeries = series.find(s => s.is_rectificativa && s.active);
  const [seriesId, setSeriesId] = useState('');
  const [rectType, setRectType] = useState<'total' | 'parcial'>('total');
  const [reason, setReason] = useState('');
  const [baseAmount, setBaseAmount] = useState((-invoice.base_amount).toString());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedSeries = seriesId || rectSeries?.id || '';
  const activeSeries = series.filter(s => s.active && s.is_rectificativa);

  const base = parseFloat(baseAmount) || 0;
  const taxAmount = Math.round(base * invoice.tax_rate / 100 * 100) / 100;
  const total = Math.round((base + taxAmount) * 100) / 100;

  const canSubmit = !!reason.trim() && !!selectedSeries && base !== 0;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setSaving(true);
    try {
      const rect = await createRectificativeInvoice(
        invoice.id,
        { rectification_type: rectType, rectification_reason: reason, base_amount: base, tax_rate: invoice.tax_rate, tax_amount: taxAmount, total_amount: total, notes: notes || undefined },
        selectedSeries,
        user.id,
        profile?.full_name || user.email || ''
      );
      toast({ title: `✅ Rectificativa ${rect.full_number} emitida` });
      onSuccess();
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Crear Factura Rectificativa</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/30 text-sm">
            <p><span className="text-muted-foreground">Factura original:</span> <strong className="font-mono">{invoice.full_number}</strong></p>
            <p><span className="text-muted-foreground">Total original:</span> {formatCurrency(invoice.total_amount)}</p>
          </div>

          <div>
            <Label>Tipo de rectificación *</Label>
            <Select value={rectType} onValueChange={v => {
              setRectType(v as 'total' | 'parcial');
              if (v === 'total') setBaseAmount((-invoice.base_amount).toString());
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Rectificación total (anula completamente)</SelectItem>
                <SelectItem value="parcial">Rectificación parcial (modifica importes)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Motivo de rectificación *</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describa el motivo..." className="min-h-[60px]" />
          </div>

          <div>
            <Label>Base imponible</Label>
            <Input type="number" step="0.01" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              {invoice.tax_type.toUpperCase()} ({invoice.tax_rate}%): {formatCurrency(taxAmount)} · Total: {formatCurrency(total)}
            </p>
          </div>

          <div>
            <Label>Serie</Label>
            <Select value={selectedSeries} onValueChange={setSeriesId}>
              <SelectTrigger><SelectValue placeholder="Serie rectificativa" /></SelectTrigger>
              <SelectContent>
                {activeSeries.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.prefix}-{s.year})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving ? 'Emitiendo...' : 'Emitir rectificativa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
