import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getInvoiceById, getInvoiceSeries, getInvoices, getPaymentsByInvoice, getInvoicePaymentSummary } from '@/lib/supabase-api';
import { formatCurrency, formatDate } from '@/lib/constants';
import { RectificativeDialog } from '@/components/invoices/RectificativeDialog';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { PaymentDialog } from '@/components/payments/PaymentDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, Loader2, RefreshCw, Download, Banknote, Plus, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const PAYMENT_STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }> = {
  pendiente: { label: 'Pendiente', variant: 'outline' },
  parcial: { label: 'Parcial', variant: 'secondary', className: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30' },
  cobrada: { label: 'Cobrada', variant: 'default', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
};

const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', financiado: 'Financiado', otro: 'Otro',
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const [rectOpen, setRectOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [invoicePdfHtml, setInvoicePdfHtml] = useState('');
  const [invoicePdfOpen, setInvoicePdfOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: invoice, isLoading } = useQuery({ queryKey: ['invoice', id], queryFn: () => getInvoiceById(id || ''), enabled: !!id });
  const { data: series = [] } = useQuery({ queryKey: ['invoice-series'], queryFn: getInvoiceSeries });
  const { data: payments = [] } = useQuery({ queryKey: ['payments-invoice', id], queryFn: () => getPaymentsByInvoice(id!), enabled: !!id });
  const { data: paymentSummary } = useQuery({ queryKey: ['payment-summary', id], queryFn: () => getInvoicePaymentSummary(id!), enabled: !!id });

  const { data: originalInvoice } = useQuery({
    queryKey: ['invoice', invoice?.rectifies_invoice_id],
    queryFn: () => getInvoiceById(invoice!.rectifies_invoice_id!),
    enabled: !!invoice?.rectifies_invoice_id,
  });

  const { data: rectificativas = [] } = useQuery({
    queryKey: ['invoices-rect', id],
    queryFn: async () => { const all = await getInvoices(); return all.filter(i => i.rectifies_invoice_id === id); },
    enabled: !!id,
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  if (!invoice) return <div className="text-center py-20 text-muted-foreground">Factura no encontrada</div>;

  const seriesName = series.find(s => s.id === invoice.series_id);
  const canRectify = invoice.status === 'emitida' && invoice.invoice_type !== 'rectificativa';
  const canPay = invoice.status === 'emitida';
  const pStatus = paymentSummary?.status || invoice.payment_status || 'pendiente';
  const pending = paymentSummary?.pending ?? invoice.total_amount;
  const netPaid = paymentSummary?.netPaid ?? 0;
  const pctPaid = invoice.total_amount > 0 ? Math.min(100, Math.round((netPaid / invoice.total_amount) * 100)) : 0;

  const progressColor = pctPaid === 0 ? 'bg-destructive' : pctPaid >= 100 ? 'bg-emerald-500' : 'bg-yellow-500';

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-invoice-pdf?invoice_id=${invoice.id}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      if (!res.ok) { alert('Error generando factura'); return; }
      const html = await res.text();
      setInvoicePdfHtml(html);
      setInvoicePdfOpen(true);
    } catch {
      alert('Error generando factura');
    } finally {
      setPdfLoading(false);
    }
  };

  const invalidatePayments = () => {
    qc.invalidateQueries({ queryKey: ['payments-invoice', id] });
    qc.invalidateQueries({ queryKey: ['payment-summary', id] });
    qc.invalidateQueries({ queryKey: ['invoice', id] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight">{invoice.full_number || 'Borrador'}</h1>
            <Badge variant={invoice.status === 'emitida' ? 'default' : invoice.status === 'rectificada' ? 'secondary' : 'outline'} className="capitalize">{invoice.status}</Badge>
            {invoice.invoice_type === 'rectificativa' && <Badge variant="destructive" className="text-[10px]">Rectificativa</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{formatDate(invoice.issue_date)}</p>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'emitida' && <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading}>{pdfLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />} PDF</Button>}
          {canRectify && <Button size="sm" variant="outline" onClick={() => setRectOpen(true)}><RefreshCw className="h-4 w-4 mr-1" /> Rectificar</Button>}
        </div>
      </div>

      {invoice.invoice_type === 'rectificativa' && originalInvoice && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm">
            <span className="font-medium">Rectifica a:</span>{' '}
            <Link to={`/invoices/${originalInvoice.id}`} className="text-primary underline font-mono">{originalInvoice.full_number}</Link>{' '}
            ({formatDate(originalInvoice.issue_date)}) — {invoice.rectification_type === 'total' ? 'Rectificación total' : 'Rectificación parcial'}: {invoice.rectification_reason}
          </CardContent>
        </Card>
      )}

      {rectificativas.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 text-sm">
            <span className="font-medium">Rectificada por:</span>{' '}
            {rectificativas.map(r => <Link key={r.id} to={`/invoices/${r.id}`} className="text-primary underline font-mono mr-2">{r.full_number}</Link>)}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Comprador</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{invoice.buyer_name}</p>
            {invoice.buyer_dni && <p className="text-muted-foreground">DNI/NIF: {invoice.buyer_dni}</p>}
            {invoice.buyer_address && <p className="text-muted-foreground">{invoice.buyer_address}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vehículo</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{invoice.vehicle_brand_model}</p>
            <p className="text-muted-foreground font-mono">{invoice.vehicle_plate}</p>
            {invoice.vehicle_vin && <p className="text-muted-foreground font-mono text-xs">VIN: {invoice.vehicle_vin}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Desglose Fiscal</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Base imponible</span><span>{formatCurrency(invoice.base_amount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{invoice.tax_type.toUpperCase()} ({invoice.tax_rate}%)</span><span>{formatCurrency(invoice.tax_amount)}</span></div>
            <Separator />
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(invoice.total_amount)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Cobros Block */}
      {invoice.status !== 'borrador' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Banknote className="h-4 w-4" /> Cobros</CardTitle>
              <Badge variant="outline" className={cn('text-[10px]', PAYMENT_STATUS_BADGE[pStatus]?.className)}>
                {PAYMENT_STATUS_BADGE[pStatus]?.label || pStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cobrado: <strong className="text-foreground">{formatCurrency(netPaid)}</strong> de {formatCurrency(invoice.total_amount)}</span>
                <span className="font-medium">{pctPaid}%</span>
              </div>
              <Progress value={pctPaid} className="h-2" />
              <style>{`.h-2 [data-state] { ${progressColor === 'bg-destructive' ? 'background: hsl(var(--destructive))' : progressColor === 'bg-emerald-500' ? 'background: #10b981' : 'background: #eab308'} }`}</style>
              {pending > 0 && (
                <p className="text-xs text-destructive font-medium">Pendiente: {formatCurrency(pending)}</p>
              )}
            </div>

            {/* Payments table */}
            {payments.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs text-right">Importe</TableHead>
                    <TableHead className="text-xs">Método</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(p => (
                    <TableRow key={p.id} className={p.is_refund ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs">{formatDate(p.payment_date)}</TableCell>
                      <TableCell className={cn('text-xs text-right font-mono font-medium', p.is_refund ? 'text-destructive' : 'text-emerald-600')}>
                        {p.is_refund ? '-' : '+'}{formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="text-xs">{METHOD_LABELS[p.payment_method] || p.payment_method}</TableCell>
                      <TableCell className="text-xs">
                        {p.is_refund ? <Badge variant="destructive" className="text-[9px]">Devolución</Badge> : <Badge variant="outline" className="text-[9px]">Cobro</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{p.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Actions */}
            {canPay && (
              <div className="flex gap-2">
                {pStatus !== 'cobrada' && (
                  <Button size="sm" onClick={() => setPaymentOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Registrar pago
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setPaymentOpen(true); }}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Registrar devolución
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notas</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{invoice.notes}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Metadatos</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Serie: {seriesName?.name || '—'} ({seriesName?.prefix || '—'})</p>
          <p>Emitida por: {invoice.issued_by_name}</p>
          <p>Creada: {formatDate(invoice.created_at)}</p>
          {invoice.hash && <p>Hash: <span className="font-mono">{invoice.hash}</span></p>}
        </CardContent>
      </Card>

      {rectOpen && (
        <RectificativeDialog
          invoice={invoice}
          open={rectOpen}
          onClose={() => setRectOpen(false)}
          onSuccess={() => { setRectOpen(false); qc.invalidateQueries({ queryKey: ['invoice', id] }); qc.invalidateQueries({ queryKey: ['invoices'] }); }}
        />
      )}

      {paymentOpen && (
        <PaymentDialog
          type="factura"
          referenceId={invoice.id}
          vehicleId={invoice.vehicle_id}
          buyerId={invoice.buyer_id}
          totalAmount={invoice.total_amount}
          pendingAmount={pending}
          isCobrada={pStatus === 'cobrada'}
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          onSuccess={() => { setPaymentOpen(false); invalidatePayments(); }}
        />
      )}

      <DocumentPreviewDialog
        open={invoicePdfOpen}
        onOpenChange={setInvoicePdfOpen}
        title={`Factura ${invoice.full_number || 'Borrador'}`}
        html={invoicePdfHtml}
        actions={[
          {
            icon: 'printer',
            tooltip: 'Imprimir',
            onClick: () => {
              const iframe = document.querySelector<HTMLIFrameElement>('iframe[title*="Factura"]');
              try { iframe?.contentWindow?.print(); } catch { window.print(); }
            },
          },
          {
            icon: 'eye',
            tooltip: 'Abrir en nueva pestaña',
            onClick: () => {
              const w = window.open('', '_blank');
              if (w) { w.document.write(invoicePdfHtml); w.document.close(); }
            },
          },
        ]}
      />
    </div>
  );
}
