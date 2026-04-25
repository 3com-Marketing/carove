import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/constants';
import type { SupplierInvoice } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    invoice_number: string;
    invoice_date: string;
    base_amount: number;
    tax_type: string;
    tax_rate: number;
    pdf_file?: File;
    rectifies_invoice_id?: string;
  }) => Promise<void>;
  supplierName: string;
  existingInvoices?: SupplierInvoice[];
}

export function SupplierInvoiceDialog({ open, onClose, onSave, supplierName, existingInvoices = [] }: Props) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [taxType, setTaxType] = useState('igic');
  const [taxRate, setTaxRate] = useState<number>(7);
  const [pdfFile, setPdfFile] = useState<File | undefined>();
  const [isRectificativa, setIsRectificativa] = useState(false);
  const [rectifiesId, setRectifiesId] = useState('');
  const [saving, setSaving] = useState(false);

  const taxAmount = Math.round(baseAmount * taxRate / 100 * 100) / 100;
  const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

  const handleSave = async () => {
    if (!invoiceNumber || !invoiceDate || baseAmount <= 0) return;
    setSaving(true);
    try {
      await onSave({
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        base_amount: baseAmount,
        tax_type: taxType,
        tax_rate: taxRate,
        pdf_file: pdfFile,
        rectifies_invoice_id: isRectificativa ? rectifiesId : undefined,
      });
      setInvoiceNumber(''); setBaseAmount(0); setPdfFile(undefined);
      setIsRectificativa(false); setRectifiesId('');
    } finally { setSaving(false); }
  };

  const nonCancelledInvoices = existingInvoices.filter(i => i.status !== 'anulada');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registrar Factura de Taller</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Proveedor</Label>
            <Input value={supplierName} disabled className="bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nº Factura *</Label><Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} /></div>
            <div><Label>Fecha *</Label><Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Base imponible *</Label><Input type="number" step="0.01" value={baseAmount || ''} onChange={e => setBaseAmount(Number(e.target.value))} /></div>
            <div>
              <Label>Impuesto</Label>
              <Select value={taxType} onValueChange={setTaxType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="igic">IGIC</SelectItem>
                  <SelectItem value="iva">IVA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tasa %</Label><Input type="number" step="0.5" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} /></div>
          </div>
          <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Impuesto:</span><span>{formatCurrency(taxAmount)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total:</span><span>{formatCurrency(totalAmount)}</span></div>
          </div>
          <div>
            <Label>PDF Factura</Label>
            <Input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0])} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isRectificativa} onCheckedChange={v => setIsRectificativa(!!v)} id="rect" />
            <Label htmlFor="rect" className="mb-0 cursor-pointer">Es factura rectificativa</Label>
          </div>
          {isRectificativa && nonCancelledInvoices.length > 0 && (
            <Select value={rectifiesId} onValueChange={setRectifiesId}>
              <SelectTrigger><SelectValue placeholder="Factura original" /></SelectTrigger>
              <SelectContent>
                {nonCancelledInvoices.map(i => <SelectItem key={i.id} value={i.id}>{i.invoice_number} — {formatCurrency(i.total_amount)}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !invoiceNumber || baseAmount <= 0}>{saving ? 'Registrando...' : 'Registrar Factura'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
