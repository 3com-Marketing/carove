import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVehiclePurchaseById, updateVehiclePurchase, updateVehiclePurchaseStatus, getPreparationItems, getLinkedTasksForPurchase, getLinkedRepairOrdersForPurchase, getPurchaseContract, getCompanySettings } from '@/lib/supabase-api';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/constants';
import { PurchaseStatusBadge } from '@/components/purchases/PurchaseStatusBadge';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, ExternalLink, User, Car, DollarSign, FileText, ClipboardCheck, ListTodo, Wrench, ScrollText, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import {
  PURCHASE_STATUS_LABELS,
  PURCHASE_SOURCE_LABELS,
  PURCHASE_PAYMENT_METHOD_LABELS,
  PURCHASE_PAYMENT_STATUS_LABELS,
  PURCHASE_NEXT_STATUSES,
  PREPARATION_STATUS_LABELS,
  PREPARATION_STATUS_COLORS,
} from '@/lib/types';
import type { PurchaseStatus, PurchasePaymentMethod, PurchasePaymentStatus, PreparationStatus } from '@/lib/types';

export default function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: purchase, isLoading } = useQuery({
    queryKey: ['vehicle-purchase', id],
    queryFn: () => getVehiclePurchaseById(id!),
    enabled: !!id,
  });

  const { data: prepItems = [] } = useQuery({
    queryKey: ['preparation-items-purchase', id],
    queryFn: () => purchase?.vehicle_id ? getPreparationItems(purchase.vehicle_id) : Promise.resolve([]),
    enabled: !!purchase?.vehicle_id && purchase?.status === 'comprado',
  });

  const { data: linkedTasks = [] } = useQuery({
    queryKey: ['linked-tasks-purchase', id],
    queryFn: () => getLinkedTasksForPurchase(id!),
    enabled: !!id && purchase?.status === 'comprado',
  });

  const { data: linkedRepairOrders = [] } = useQuery({
    queryKey: ['linked-repair-orders-purchase', id],
    queryFn: () => getLinkedRepairOrdersForPurchase(id!),
    enabled: !!id && purchase?.status === 'comprado',
  });

  const { data: existingContract, refetch: refetchContract } = useQuery({
    queryKey: ['purchase-contract', id],
    queryFn: () => getPurchaseContract(id!),
    enabled: !!id && ['acordado', 'comprado'].includes(purchase?.status || ''),
  });

  const [offeredPrice, setOfferedPrice] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>('pendiente_definir');
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>('pendiente');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [contractPreviewOpen, setContractPreviewOpen] = useState(false);
  const [contractHtml, setContractHtml] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [destructiveAction, setDestructiveAction] = useState<{ status: PurchaseStatus; label: string } | null>(null);
  const [destructiveReason, setDestructiveReason] = useState('');

  useEffect(() => {
    if (purchase) {
      setOfferedPrice(purchase.offered_price?.toString() || '');
      setAgreedPrice(purchase.agreed_price?.toString() || '');
      setPaymentMethod(purchase.payment_method);
      setPaymentStatus(purchase.payment_status);
      setInvoiceNumber(purchase.purchase_invoice_number || '');
      setInvoiceDate((purchase as any).purchase_invoice_date || '');
      setNotes(purchase.notes || '');
      setInternalNotes(purchase.internal_notes || '');
    }
  }, [purchase]);

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>;
  if (!purchase) return <div className="flex items-center justify-center h-64 text-muted-foreground">Operación no encontrada</div>;

  const seller = purchase.seller;
  const vehicle = purchase.vehicle;
  const isFinalized = ['comprado', 'cancelado', 'rechazado'].includes(purchase.status);
  const nextStatuses = PURCHASE_NEXT_STATUSES[purchase.status as PurchaseStatus] || [];

  const sellerName = seller?.client_type === 'profesional'
    ? seller?.company_name || seller?.name
    : [seller?.name, seller?.last_name].filter(Boolean).join(' ');

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateVehiclePurchase(purchase.id, {
        offered_price: offeredPrice ? parseFloat(offeredPrice) : null,
        agreed_price: agreedPrice ? parseFloat(agreedPrice) : null,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        purchase_invoice_number: invoiceNumber || null,
        purchase_invoice_date: invoiceDate || null,
        notes: notes || null,
        internal_notes: internalNotes || null,
      } as any, user.id);
      toast.success('Operación actualizada');
      qc.invalidateQueries({ queryKey: ['vehicle-purchase', id] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: PurchaseStatus) => {
    if (!user) return;

    // Intercept destructive actions with confirmation dialog
    if (newStatus === 'cancelado' || newStatus === 'rechazado') {
      setDestructiveAction({ status: newStatus, label: PURCHASE_STATUS_LABELS[newStatus] });
      setDestructiveReason('');
      return;
    }

    await executeStatusChange(newStatus);
  };

  const executeStatusChange = async (newStatus: PurchaseStatus, reason?: string) => {
    if (!user) return;
    try {
      const extras: any = {};
      if (newStatus === 'acordado' || newStatus === 'comprado') {
        if (!agreedPrice || parseFloat(agreedPrice) <= 0) {
          toast.error('Debes indicar el precio acordado antes de cambiar a este estado');
          return;
        }
        extras.agreed_price = parseFloat(agreedPrice);
      }
      if (reason) {
        extras.notes = (purchase.notes ? purchase.notes + '\n' : '') + `[${PURCHASE_STATUS_LABELS[newStatus]}] ${reason}`;
      }
      await updateVehiclePurchaseStatus(purchase.id, newStatus, user.id, extras);
      toast.success(`Estado actualizado a "${PURCHASE_STATUS_LABELS[newStatus]}"`);
      qc.invalidateQueries({ queryKey: ['vehicle-purchase', id] });
      qc.invalidateQueries({ queryKey: ['vehicle-purchases'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleConfirmDestructiveAction = async () => {
    if (!destructiveAction) return;
    if (!destructiveReason.trim()) {
      toast.error('Indica un motivo para esta acción');
      return;
    }
    await executeStatusChange(destructiveAction.status, destructiveReason.trim());
    setDestructiveAction(null);
    setDestructiveReason('');
  };

  const handleGenerateContract = async () => {
    if (!user) return;
    setGeneratingContract(true);
    try {
      // Validate agreed price
      if (!purchase.agreed_price || purchase.agreed_price <= 0) {
        toast.error('No se puede generar el contrato: el precio pactado no está definido. Indica el precio acordado y guarda antes de generar.', { duration: 6000 });
        setGeneratingContract(false);
        return;
      }

      // Validate company settings
      const company = await getCompanySettings();
      if (!company?.company_name || !company?.tax_id) {
        toast.error('Faltan datos corporativos obligatorios (razón social y CIF). Completa los datos en Configuración → Datos de empresa.', { duration: 6000 });
        setGeneratingContract(false);
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) { toast.error('Sesión no válida'); return; }

      const res = await supabase.functions.invoke('generate-report-pdf', {
        body: { type: 'purchase-contract', params: { purchase_id: id } },
      });

      if (res.error || !res.data?.url) {
        toast.error('Error generando contrato');
        return;
      }

      // Fetch the HTML
      const htmlRes = await fetch(res.data.url);
      const html = await htmlRes.text();
      setContractHtml(html);
      setContractPreviewOpen(true);
      refetchContract();
      toast.success('Contrato generado correctamente');
    } catch (e: any) {
      toast.error(e.message || 'Error generando contrato');
    } finally {
      setGeneratingContract(false);
    }
  };

  const handleViewContract = () => {
    if (existingContract?.html_content) {
      setContractHtml(existingContract.html_content);
      setContractPreviewOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/purchases')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            Compra — {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Sin vehículo'}
          </h1>
          <p className="text-sm text-muted-foreground">{vehicle?.plate || ''}</p>
        </div>
        <PurchaseStatusBadge status={purchase.status as PurchaseStatus} className="text-sm px-3 py-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seller */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nombre</span>
                  <p className="font-medium">{sellerName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo</span>
                  <p>{seller?.client_type === 'profesional' ? 'Profesional' : 'Particular'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Teléfono</span>
                  <p>{seller?.phone || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p>{seller?.email || '—'}</p>
                </div>
              </div>
              <Link to={`/clients/${purchase.seller_id}`} className="text-xs text-primary flex items-center gap-1 mt-3 hover:underline">
                <ExternalLink className="h-3 w-3" /> Ver ficha del cliente
              </Link>
            </CardContent>
          </Card>

          {/* Vehicle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Car className="h-4 w-4" /> Vehículo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Marca / Modelo</span>
                  <p className="font-medium">{vehicle?.brand} {vehicle?.model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Matrícula</span>
                  <p className="font-medium">{vehicle?.plate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">VIN</span>
                  <p>{vehicle?.vin || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">PVP actual</span>
                  <p>{vehicle?.price_cash ? formatCurrency(vehicle.price_cash) : '—'}</p>
                </div>
              </div>
              <Link to={`/vehicles/${purchase.vehicle_id}`} className="text-xs text-primary flex items-center gap-1 mt-3 hover:underline">
                <ExternalLink className="h-3 w-3" /> Ver ficha del vehículo
              </Link>
            </CardContent>
          </Card>

          {/* Negotiation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Negociación económica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Precio solicitado</Label>
                  <p className="font-semibold text-lg">{formatCurrency(purchase.requested_price || 0)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Valor tasado mercado</Label>
                  <p className="font-medium">{purchase.appraised_market_value != null ? formatCurrency(purchase.appraised_market_value) : '—'}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Precio ofertado (€)</Label>
                  <Input type="number" value={offeredPrice} onChange={e => setOfferedPrice(e.target.value)} disabled={isFinalized} />
                </div>
                <div>
                  <Label>Precio acordado (€)</Label>
                  <Input type="number" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)} disabled={isFinalized} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Documentation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {seller?.client_type === 'profesional' ? 'Pago y facturación' : 'Pago y documentación'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`grid ${seller?.client_type === 'profesional' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'} gap-4`}>
                <div>
                  <Label>Método de pago</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PurchasePaymentMethod)} disabled={isFinalized}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PURCHASE_PAYMENT_METHOD_LABELS) as [PurchasePaymentMethod, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado del pago</Label>
                  <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PurchasePaymentStatus)} disabled={isFinalized}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PURCHASE_PAYMENT_STATUS_LABELS) as [PurchasePaymentStatus, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {seller?.client_type === 'profesional' && (
                  <div>
                    <Label>Nº Factura proveedor</Label>
                    <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} disabled={isFinalized} placeholder="Ej: F-2025-001" />
                  </div>
                )}
                {seller?.client_type === 'profesional' && (
                  <div>
                    <Label>Fecha factura</Label>
                    <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} disabled={isFinalized} />
                  </div>
                )}
              </div>
              {seller?.client_type !== 'profesional' && existingContract?.contract_number && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                  <ScrollText className="h-3 w-3" />
                  Documento de adquisición: <span className="font-medium text-foreground">{existingContract.contract_number}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Notas generales</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} disabled={isFinalized} />
              </div>
              <div>
                <Label>Notas internas</Label>
                <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={3} disabled={isFinalized} />
              </div>
            </CardContent>
          </Card>

          {!isFinalized && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
            </div>
          )}
          {/* Preparation progress block */}
          {purchase.status === 'comprado' && prepItems.length > 0 && (() => {
            const total = prepItems.length;
            const completed = prepItems.filter(i => i.is_completed).length;
            const reqTotal = prepItems.filter(i => i.is_required).length;
            const reqDone = prepItems.filter(i => i.is_required && i.is_completed).length;
            const pct = reqTotal > 0 ? Math.round((reqDone / reqTotal) * 100) : 0;
            const prepStatus: PreparationStatus = reqDone >= reqTotal && reqTotal > 0 ? 'completado' : completed > 0 ? 'en_progreso' : 'pendiente';
            return (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" /> Preparación del vehículo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={PREPARATION_STATUS_COLORS[prepStatus]}>{PREPARATION_STATUS_LABELS[prepStatus]}</Badge>
                    <span className="text-sm font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">{reqDone}/{reqTotal} obligatorios · {completed}/{total} total</p>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/vehicles/${purchase.vehicle_id}`}>Ver checklist completo</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          {/* Linked Tasks */}
          {purchase.status === 'comprado' && linkedTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListTodo className="h-4 w-4" /> Tareas generadas ({linkedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {linkedTasks.slice(0, 8).map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span className={t.status === 'completada' ? 'line-through text-muted-foreground' : ''}>{t.title}</span>
                      <Badge variant={t.status === 'completada' ? 'default' : t.status === 'en_curso' ? 'secondary' : 'outline'} className="text-[10px]">
                        {t.status === 'completada' ? '✓' : t.status === 'en_curso' ? 'En curso' : 'Pendiente'}
                      </Badge>
                    </div>
                  ))}
                  {linkedTasks.length > 8 && <p className="text-xs text-muted-foreground">... y {linkedTasks.length - 8} más</p>}
                  <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                    <Link to="/tasks">Ver todas en Tareas</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Repair Orders */}
          {purchase.status === 'comprado' && linkedRepairOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Órdenes de taller ({linkedRepairOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {linkedRepairOrders.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{r.supplier_name || 'Sin proveedor'}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {r.is_internal ? '🏠 Interno' : '🔧 Externo'}
                        </Badge>
                      </div>
                      <Badge variant={r.status === 'finalizada' ? 'default' : 'outline'} className="text-[10px]">
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                    <Link to="/postventa/repairs">Ver en Reparaciones</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Estado de la operación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <PurchaseStatusBadge status={purchase.status as PurchaseStatus} className="text-sm px-4 py-1.5" />
              </div>
              <div className="text-sm space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Origen</span>
                  <Badge variant="outline">{PURCHASE_SOURCE_LABELS[purchase.source_type as keyof typeof PURCHASE_SOURCE_LABELS]}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Creada</span>
                  <span>{formatDate(purchase.created_at)}</span>
                </div>
                {purchase.purchase_date && (
                  <div className="flex justify-between">
                    <span>Fecha compra</span>
                    <span>{formatDate(purchase.purchase_date)}</span>
                  </div>
                )}
              </div>
              {nextStatuses.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Avanzar estado</p>
                    {nextStatuses.map(ns => (
                      <Button
                        key={ns}
                        variant={ns === 'cancelado' || ns === 'rechazado' ? 'destructive' : ns === 'comprado' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full"
                        onClick={() => handleStatusChange(ns)}
                      >
                        {PURCHASE_STATUS_LABELS[ns]}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen económico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Solicitado</span>
                <span className="font-medium">{formatCurrency(purchase.requested_price || 0)}</span>
              </div>
              {purchase.offered_price != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ofertado</span>
                  <span className="font-medium">{formatCurrency(purchase.offered_price)}</span>
                </div>
              )}
              {purchase.agreed_price != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acordado</span>
                  <span className="font-bold text-primary">{formatCurrency(purchase.agreed_price)}</span>
                </div>
              )}
              {purchase.requested_price > 0 && purchase.agreed_price != null && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ahorro vs solicitado</span>
                    <span className={`font-medium ${purchase.requested_price - purchase.agreed_price > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {formatCurrency(purchase.requested_price - purchase.agreed_price)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contract */}
          {['acordado', 'comprado'].includes(purchase.status) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ScrollText className="h-4 w-4" /> Contrato de compra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {existingContract ? (
                  <>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nº Contrato</span>
                        <span className="font-medium">{existingContract.contract_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estado</span>
                        <Badge variant="outline" className="text-[10px]">{existingContract.status === 'generado' ? '✅ Generado' : existingContract.status}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Generado</span>
                        <span className="text-xs">{formatDate(existingContract.generated_at)}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={handleViewContract}>
                      <ScrollText className="h-4 w-4 mr-1" /> Ver contrato
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={handleGenerateContract} disabled={generatingContract}>
                      {generatingContract ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ScrollText className="h-4 w-4 mr-1" />}
                      Regenerar contrato
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Genera el contrato de compra con los datos corporativos y del vendedor.</p>
                    <Button size="sm" className="w-full" onClick={handleGenerateContract} disabled={generatingContract}>
                      {generatingContract ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ScrollText className="h-4 w-4 mr-1" />}
                      {generatingContract ? 'Generando...' : 'Generar contrato'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DocumentPreviewDialog
        open={contractPreviewOpen}
        onOpenChange={setContractPreviewOpen}
        title={`Contrato de Compra — ${existingContract?.contract_number || ''}`}
        html={contractHtml}
        actions={[
          {
            icon: 'printer',
            tooltip: 'Imprimir',
            onClick: () => {
              const w = window.open('', '_blank');
              if (w) { w.document.write(contractHtml); w.document.close(); w.print(); }
            },
          },
        ]}
      />

      {/* Destructive action confirmation dialog */}
      <AlertDialog open={!!destructiveAction} onOpenChange={(open) => !open && setDestructiveAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {destructiveAction?.status === 'cancelado' ? '¿Cancelar esta operación?' : '¿Rechazar esta operación?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Indica el motivo para continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Motivo *</Label>
            <Textarea
              value={destructiveReason}
              onChange={e => setDestructiveReason(e.target.value)}
              placeholder="Indica el motivo..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDestructiveAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar {destructiveAction?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
