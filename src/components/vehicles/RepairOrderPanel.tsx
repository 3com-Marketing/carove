import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRepairOrderCategories, getSupplierInvoices, getSupplierPayments, createRepairOrderCategory, updateRepairOrderCategory, deleteRepairOrderCategory, createSupplierInvoice, cancelSupplierInvoice, createSupplierPayment, updateRepairOrderStatus, getActiveRepairOrder, getRepairOrders, createRepairOrder, getSuppliers, uploadDocument } from '@/lib/supabase-api';
import { getBankAccounts } from '@/lib/supabase-api';
import type { RepairOrder, RepairOrderCategory, SupplierInvoice, SupplierPayment, Supplier, BankAccount } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Wrench, Plus, Trash2, FileText, CreditCard, ChevronDown, Ban, CheckCircle, Loader2 } from 'lucide-react';
import { RepairOrderDialog } from './RepairOrderDialog';
import { SupplierInvoiceDialog } from './SupplierInvoiceDialog';
import { SupplierPaymentDialog } from './SupplierPaymentDialog';

const STATUS_LABELS: Record<string, string> = {
  abierta: 'Abierta', presupuestada: 'Presupuestada', aprobada: 'Aprobada',
  en_ejecucion: 'En Ejecución', finalizada: 'Finalizada', cancelada: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  abierta: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  presupuestada: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  aprobada: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  en_ejecucion: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  finalizada: 'bg-green-500/10 text-green-700 border-green-500/20',
  cancelada: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const STATUS_FLOW = ['abierta', 'presupuestada', 'aprobada', 'en_ejecucion'];

const CATEGORY_LABELS: Record<string, string> = {
  mecanica: 'Mecánica', chapa_pintura: 'Chapa y Pintura', electricidad: 'Electricidad',
  estetica: 'Estética', revision_preventa: 'Revisión Pre-venta', detailing: 'Detailing', otros: 'Otros',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', parcialmente_pagada: 'Parcial', pagada: 'Pagada', anulada: 'Anulada',
};

interface Props {
  vehicleId: string;
}

export function RepairOrderPanel({ vehicleId }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: activeOrder, isLoading: loadingOrder } = useQuery({ queryKey: ['repair-order-active', vehicleId], queryFn: () => getActiveRepairOrder(vehicleId) });
  const { data: allOrders = [] } = useQuery({ queryKey: ['repair-orders', vehicleId], queryFn: () => getRepairOrders(vehicleId) });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const { data: bankAccounts = [] } = useQuery({ queryKey: ['bank-accounts'], queryFn: getBankAccounts });

  const orderId = activeOrder?.id;
  const { data: categories = [] } = useQuery({ queryKey: ['repair-categories', orderId], queryFn: () => getRepairOrderCategories(orderId!), enabled: !!orderId });
  const { data: invoices = [] } = useQuery({ queryKey: ['supplier-invoices', orderId], queryFn: () => getSupplierInvoices(orderId!), enabled: !!orderId });

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<SupplierInvoice | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  // Payments per invoice
  const [invoicePayments, setInvoicePayments] = useState<Record<string, SupplierPayment[]>>({});
  const loadPayments = async (invoiceId: string) => {
    const payments = await getSupplierPayments(invoiceId);
    setInvoicePayments(p => ({ ...p, [invoiceId]: payments }));
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['repair-order-active', vehicleId] });
    qc.invalidateQueries({ queryKey: ['repair-orders', vehicleId] });
    qc.invalidateQueries({ queryKey: ['repair-categories', orderId] });
    qc.invalidateQueries({ queryKey: ['supplier-invoices', orderId] });
    qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
    qc.invalidateQueries({ queryKey: ['expenses', vehicleId] });
  };

  const handleCreateOrder = async (data: { supplier_id: string; estimated_end_date?: string; observations?: string; categories: any[] }) => {
    if (!user) return;
    try {
      const order = await createRepairOrder({ vehicle_id: vehicleId, supplier_id: data.supplier_id, estimated_end_date: data.estimated_end_date, observations: data.observations }, user.id);
      for (const cat of data.categories) {
        await createRepairOrderCategory({ repair_order_id: order.id, category_type: cat.category_type, estimated_amount: cat.estimated_amount, description: cat.description });
      }
      invalidateAll();
      setNewOrderOpen(false);
      toast({ title: '✅ Orden de reparación creada' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!orderId) return;
    try {
      await updateRepairOrderStatus(orderId, newStatus);
      invalidateAll();
      toast({ title: `✅ Estado: ${STATUS_LABELS[newStatus]}` });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId || !cancelReason.trim()) return;
    try {
      await updateRepairOrderStatus(orderId, 'cancelada', cancelReason);
      invalidateAll();
      setCancelReason('');
      toast({ title: '✅ Orden cancelada' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleCreateInvoice = async (data: any) => {
    if (!user || !activeOrder) return;
    try {
      let pdfPath: string | undefined;
      if (data.pdf_file) {
        const doc = await uploadDocument(data.pdf_file, vehicleId, 'Factura taller', user.id, profile?.full_name || user.email || '');
        pdfPath = doc.file_url;
      }
      await createSupplierInvoice({
        repair_order_id: activeOrder.id,
        vehicle_id: vehicleId,
        supplier_id: activeOrder.supplier_id,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        base_amount: data.base_amount,
        tax_type: data.tax_type,
        tax_rate: data.tax_rate,
        pdf_path: pdfPath,
        rectifies_invoice_id: data.rectifies_invoice_id,
      }, user.id);
      invalidateAll();
      setInvoiceDialogOpen(false);
      toast({ title: '✅ Factura registrada' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelInvoiceId || !cancelReason.trim() || !user) return;
    try {
      await cancelSupplierInvoice(cancelInvoiceId, cancelReason, user.id);
      invalidateAll();
      setCancelInvoiceId(null);
      setCancelReason('');
      toast({ title: '✅ Factura anulada' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleCreatePayment = async (data: any) => {
    if (!user || !paymentInvoice) return;
    try {
      await createSupplierPayment({ supplier_invoice_id: paymentInvoice.id, ...data }, user.id);
      invalidateAll();
      loadPayments(paymentInvoice.id);
      setPaymentDialogOpen(false);
      setPaymentInvoice(null);
      toast({ title: '✅ Pago registrado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const supplierName = (id: string) => suppliers.find(s => s.id === id)?.name || '—';

  if (loadingOrder) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  // Computed
  const totalInvoiced = invoices.filter(i => i.status !== 'anulada').reduce((s, i) => s + Number(i.total_amount), 0);
  const historicOrders = allOrders.filter(o => o.status === 'finalizada' || o.status === 'cancelada');

  // ── No active order ──
  if (!activeOrder) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-12">
          <Wrench className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4">Sin orden de reparación activa</p>
          <Button onClick={() => setNewOrderOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nueva Orden de Reparación</Button>
        </div>
        {historicOrders.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="text-sm text-muted-foreground">Historial ({historicOrders.length})</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-2">
                {historicOrders.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md text-sm">
                    <div>
                      <span className="font-medium">{supplierName(o.supplier_id)}</span>
                      <span className="text-muted-foreground ml-2">{formatDate(o.created_at)}</span>
                    </div>
                    <Badge className={STATUS_COLORS[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        <RepairOrderDialog open={newOrderOpen} onClose={() => setNewOrderOpen(false)} onSave={handleCreateOrder} suppliers={suppliers} />
      </div>
    );
  }

  // ── Active order ──
  const currentIdx = STATUS_FLOW.indexOf(activeOrder.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Badge className={STATUS_COLORS[activeOrder.status]}>{STATUS_LABELS[activeOrder.status]}</Badge>
              <span className="font-medium">{supplierName(activeOrder.supplier_id)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {activeOrder.estimated_end_date && <span>Prevista: {formatDate(activeOrder.estimated_end_date)}</span>}
              <span className="font-semibold text-foreground">Estimado: {formatCurrency(activeOrder.estimated_total)}</span>
            </div>
          </div>
          {activeOrder.observations && <p className="text-sm text-muted-foreground mt-2">{activeOrder.observations}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {nextStatus && <Button size="sm" variant="outline" onClick={() => handleStatusChange(nextStatus)}>→ {STATUS_LABELS[nextStatus]}</Button>}
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('finalizada')}><CheckCircle className="h-3.5 w-3.5 mr-1" /> Finalizar</Button>
            <AlertDialog>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelReason('')}>
                <Ban className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Categorías del presupuesto</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead className="text-right">Estimado</TableHead><TableHead>Descripción</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
            <TableBody>
              {categories.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell className="text-sm">{CATEGORY_LABELS[cat.category_type] || cat.category_type}</TableCell>
                  <TableCell className="text-sm text-right font-medium">{formatCurrency(cat.estimated_amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cat.description || '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { await deleteRepairOrderCategory(cat.id); invalidateAll(); }}><Trash2 className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin categorías</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Facturas del taller</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setInvoiceDialogOpen(true)}><FileText className="h-3.5 w-3.5 mr-1" /> Registrar factura</Button>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin facturas registradas</p>
          ) : (
            <div className="space-y-3">
              {invoices.map(inv => {
                const payments = invoicePayments[inv.id] || [];
                const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
                const pending = Number(inv.total_amount) - totalPaid;
                return (
                  <div key={inv.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{inv.invoice_number}</span>
                        <Badge variant="outline" className="text-xs">{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                        {inv.rectifies_invoice_id && <Badge variant="outline" className="text-xs">Rectificativa</Badge>}
                      </div>
                      <span className="font-semibold text-sm">{formatCurrency(inv.total_amount)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(inv.invoice_date)} · Base: {formatCurrency(inv.base_amount)} + {inv.tax_type.toUpperCase()} {inv.tax_rate}%
                      {inv.pdf_path && <span className="ml-2">📎 PDF</span>}
                    </div>
                    {inv.status !== 'anulada' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setPaymentInvoice(inv); loadPayments(inv.id); setPaymentDialogOpen(true); }}>
                          <CreditCard className="h-3 w-3 mr-1" /> Pagar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { setCancelInvoiceId(inv.id); setCancelReason(''); }}>
                          <Ban className="h-3 w-3 mr-1" /> Anular
                        </Button>
                      </div>
                    )}
                    {inv.status === 'anulada' && inv.cancellation_reason && (
                      <p className="text-xs text-destructive">Motivo: {inv.cancellation_reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Resumen financiero</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-xs text-muted-foreground">Estimado</p><p className="font-semibold">{formatCurrency(activeOrder.estimated_total)}</p></div>
            <div><p className="text-xs text-muted-foreground">Facturado</p><p className="font-semibold">{formatCurrency(totalInvoiced)}</p></div>
            <div>
              <p className="text-xs text-muted-foreground">Desviación</p>
              <p className={`font-semibold ${totalInvoiced > activeOrder.estimated_total ? 'text-destructive' : 'text-emerald-600'}`}>
                {activeOrder.estimated_total > 0 ? `${((totalInvoiced - activeOrder.estimated_total) / activeOrder.estimated_total * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
            <div><p className="text-xs text-muted-foreground">Diferencia</p><p className="font-semibold">{formatCurrency(totalInvoiced - activeOrder.estimated_total)}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SupplierInvoiceDialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        onSave={handleCreateInvoice}
        supplierName={supplierName(activeOrder.supplier_id)}
        existingInvoices={invoices}
      />

      {paymentInvoice && (
        <SupplierPaymentDialog
          open={paymentDialogOpen}
          onClose={() => { setPaymentDialogOpen(false); setPaymentInvoice(null); }}
          onSave={handleCreatePayment}
          pendingAmount={Number(paymentInvoice.total_amount) - (invoicePayments[paymentInvoice.id] || []).reduce((s, p) => s + Number(p.amount), 0)}
          bankAccounts={bankAccounts}
        />
      )}

      {/* Cancel invoice dialog */}
      <AlertDialog open={!!cancelInvoiceId} onOpenChange={o => !o && setCancelInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular factura</AlertDialogTitle>
            <AlertDialogDescription>Se revertirá el gasto generado y el asiento contable. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Motivo de anulación (obligatorio)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvoice} disabled={!cancelReason.trim()}>Anular factura</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
