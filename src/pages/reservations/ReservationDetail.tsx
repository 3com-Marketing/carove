import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getReservationById, getBuyerById, getVehicleById, getCompanySettings,
  cancelReservation, expireReservation, updateReservation,
  getPaymentsByReservation, updateReservationWorkflowStatus,
  passToSignature, markAsSigned, addTimelineEvent,
  generateAndSaveDocument, viewDocumentHtml, getLatestReservationDocument,
} from '@/lib/supabase-api';
import { formatCurrency, formatDate } from '@/lib/constants';
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS } from '@/lib/types';
import type { ReservationWorkflowStatus, CompanySettings, Vehicle, Buyer, Reservation } from '@/lib/types';

import { PaymentDialog } from '@/components/payments/PaymentDialog';

import { ContractEditor } from '@/components/reservations/ContractEditor';
import { PassToSignatureDialog } from '@/components/reservations/PassToSignatureDialog';
import { ReservationDocumentsCard } from '@/components/reservations/ReservationDocumentsCard';
import { ReservationTimeline } from '@/components/reservations/ReservationTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, CalendarIcon, Car, UserCheck, Banknote, Clock, FileText,
  ShoppingCart, CalendarPlus, XCircle, AlertTriangle, Loader2,
  RotateCcw, CheckCircle2, PenLine, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, differenceInHours, isBefore, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';


const METHOD_LABELS: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', financiado: 'Financiado', otro: 'Otro',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending_signature', 'cancelled'],
  pending_signature: ['signed', 'cancelled'],
  signed: ['converted', 'cancelled', 'expired'],
  expired: ['signed', 'cancelled'],
  cancelled: [],
  converted: [],
};

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: reservation, isLoading } = useQuery({ queryKey: ['reservation', id], queryFn: () => getReservationById(id!), enabled: !!id });
  const { data: vehicle } = useQuery({ queryKey: ['vehicle', reservation?.vehicle_id], queryFn: () => getVehicleById(reservation!.vehicle_id), enabled: !!reservation?.vehicle_id });
  const { data: buyer } = useQuery({ queryKey: ['buyer', reservation?.buyer_id], queryFn: () => getBuyerById(reservation!.buyer_id), enabled: !!reservation?.buyer_id });
  const { data: company } = useQuery({ queryKey: ['company-settings'], queryFn: getCompanySettings });
  const { data: payments = [] } = useQuery({ queryKey: ['payments-reservation', id], queryFn: () => getPaymentsByReservation(id!), enabled: !!id });

  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentRefund, setPaymentRefund] = useState(false);
  const [newDate, setNewDate] = useState<Date>(addDays(new Date(), 3));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [passToSignOpen, setPassToSignOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorHtml, setEditorHtml] = useState('');
  const [editorDocId, setEditorDocId] = useState('');
  const [editorVersion, setEditorVersion] = useState(1);
  const [editorTitle, setEditorTitle] = useState('');

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  if (!reservation) return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <p className="text-muted-foreground mb-4">Reserva no encontrada</p>
      <Button variant="outline" onClick={() => navigate('/reservations')}>Volver</Button>
    </div>
  );

  const wfStatus = (reservation.reservation_status || 'draft') as ReservationWorkflowStatus;
  const exp = new Date(reservation.expiration_date);
  const isExpired = isPast(exp) && wfStatus === 'signed';
  const hoursLeft = differenceInHours(exp, new Date());
  const isReadOnly = ['cancelled', 'converted'].includes(wfStatus);
  const allowedTransitions = VALID_TRANSITIONS[wfStatus] || [];

  const totalPaid = payments.filter(p => !p.is_refund).reduce((s, p) => s + p.amount, 0);
  const totalRefunded = payments.filter(p => p.is_refund).reduce((s, p) => s + p.amount, 0);
  const netPaid = Math.round((totalPaid - totalRefunded) * 100) / 100;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['reservation', id] });
    qc.invalidateQueries({ queryKey: ['reservations'] });
    qc.invalidateQueries({ queryKey: ['vehicles'] });
    qc.invalidateQueries({ queryKey: ['payments-reservation', id] });
    qc.invalidateQueries({ queryKey: ['reservation-documents', id] });
    qc.invalidateQueries({ queryKey: ['reservation-timeline', id] });
  };

  const handleStatusChange = async (newStatus: string, extraUpdates?: Record<string, any>) => {
    setActionLoading(true);
    try {
      if (newStatus === 'cancelled') {
        await cancelReservation(reservation.id, cancelReason);
        if (user?.id && profile?.full_name) await addTimelineEvent(reservation.id, 'cancelled', user.id, profile.full_name, { reason: cancelReason });
      } else if (newStatus === 'expired') {
        await expireReservation(reservation.id);
        if (user?.id && profile?.full_name) await addTimelineEvent(reservation.id, 'expired', user.id, profile.full_name);
      } else {
        await updateReservationWorkflowStatus(reservation.id, newStatus, extraUpdates);
      }
      invalidateAll();
      toast.success(`Estado actualizado a "${RESERVATION_STATUS_LABELS[newStatus as ReservationWorkflowStatus] || newStatus}"`);
      setCancelDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  };

  const handleExtend = async () => {
    setActionLoading(true);
    try {
      const updates: any = {
        expiration_date: newDate.toISOString(),
        reminder_24h_sent: false,
        reminder_24h_sent_at: null,
        reminder_same_day_sent: false,
        reminder_same_day_sent_at: null,
      };
      if (wfStatus === 'expired') {
        updates.reservation_status = 'signed';
      }
      await updateReservation(reservation.id, updates);
      if (user?.id && profile?.full_name) await addTimelineEvent(reservation.id, 'extended', user.id, profile.full_name, { new_date: newDate.toISOString() });
      invalidateAll();
      toast.success(`Reserva extendida hasta ${format(newDate, 'dd/MM/yyyy')}`);
      setExtendDialogOpen(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  };

  const handleRecalculateDeposit = async () => {
    if (!vehicle) return;
    const newAmount = Math.round(vehicle.pvp_base * 0.03 * 100) / 100;
    setActionLoading(true);
    try {
      await updateReservation(reservation.id, {
        reservation_amount: newAmount,
        deposit_amount_source: 'auto',
        vehicle_pvp_snapshot: vehicle.pvp_base,
      } as any);
      if (user?.id && profile?.full_name) await addTimelineEvent(reservation.id, 'deposit_recalculated', user.id, profile.full_name, { amount: newAmount });
      invalidateAll();
      toast.success(`Señal recalculada: ${formatCurrency(newAmount)}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  };

  const buildDocumentSnapshot = () => {
    if (!vehicle || !buyer || !company) return null;
    return {
      company: {
        name: company.company_name || '',
        tax_id: company.tax_id || '',
        address: [company.address, company.postal_code, company.city, company.province].filter(Boolean).join(', '),
        phone: company.phone || '',
        email: company.email || '',
        iban: company.iban || '',
      },
      customer: {
        full_name: `${buyer.name}${buyer.last_name ? ' ' + buyer.last_name : ''}`,
        tax_id: buyer.dni || buyer.cif || '',
        address: buyer.address || '',
        city: buyer.city || '',
        postal_code: buyer.postal_code || '',
        province: buyer.province || '',
        phone: buyer.phone || '',
        email: buyer.email || '',
        client_type: buyer.client_type,
      },
      vehicle: {
        make: vehicle.brand,
        model: vehicle.model,
        version: vehicle.version,
        plate: vehicle.plate,
        vin: vehicle.vin,
        registration_date: vehicle.first_registration,
        mileage: vehicle.km_entry,
        color: vehicle.color,
        has_second_key: vehicle.has_second_key,
      },
      pricing: {
        sale_price: vehicle.pvp_base,
        deposit_amount: reservation.reservation_amount,
        remaining_amount: vehicle.pvp_base - reservation.reservation_amount,
        deposit_source: reservation.deposit_amount_source,
        tax_type: vehicle.tax_type,
        tax_rate: vehicle.tax_rate,
      },
      payment: {
        method: reservation.payment_method || reservation.deposit_payment_method || null,
      },
      reservation: {
        number: reservation.reservation_number || '',
        created_at: reservation.reservation_date,
        expiration_date: reservation.expiration_date,
      },
      generated_at: new Date().toISOString(),
    };
  };

  const handlePassToSignature = async (snapshot: any) => {
    if (!user?.id || !profile?.full_name) return;
    try {
      const result = await passToSignature(reservation.id, user.id, profile.full_name, snapshot);
      invalidateAll();
      toast.success('Reserva pasada a firma. Contrato y proforma generados.');
      setPassToSignOpen(false);
      // Auto-show the contract in editor
      const contractDoc = await getLatestReservationDocument(reservation.id, 'sales_contract');
      setEditorHtml(result.contractHtml);
      setEditorDocId(contractDoc?.id || '');
      setEditorVersion(contractDoc?.version || 1);
      setEditorTitle(DOC_TITLE_MAP['sales_contract']);
      setEditorOpen(true);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleMarkSigned = async () => {
    if (!user?.id || !profile?.full_name) return;
    setActionLoading(true);
    try {
      await markAsSigned(reservation.id, user.id, profile.full_name);
      invalidateAll();
      toast.success('Reserva marcada como firmada');
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  };

  // handleMarkPaid and handleMarkDelivered removed — managed in /sales

  const DOC_TITLE_MAP: Record<string, string> = {
    reservation_document: 'Documento de Reserva',
    deposit_receipt: 'Recibo de Señal',
    sales_contract: 'Contrato de Compraventa',
    proforma_invoice: 'Factura Proforma',
  };

  /** View an existing document (no new version created) */
  const handleViewDocument = async (type: string) => {
    setActionLoading(true);
    try {
      const doc = await getLatestReservationDocument(reservation.id, type);
      const html = await viewDocumentHtml(reservation.id, type);
      setEditorHtml(html);
      setEditorDocId(doc?.id || '');
      setEditorVersion(doc?.version || 1);
      setEditorTitle(DOC_TITLE_MAP[type] || 'Documento');
      setEditorOpen(true);
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  };

  /** Generate (or regenerate) a document — creates a new version with snapshot */
  const handleGenerateDocument = async (type: string) => {
    if (!user?.id || !profile?.full_name) return;
    setActionLoading(true);
    try {
      const snapshot = buildDocumentSnapshot();
      if (!snapshot) throw new Error('Faltan datos para generar el documento');

      const { html, doc } = await generateAndSaveDocument(
        reservation.id, type, snapshot, user.id, profile.full_name
      );

      setEditorHtml(html);
      setEditorDocId(doc.id);
      setEditorVersion(doc.version);
      setEditorTitle(DOC_TITLE_MAP[type] || 'Documento');
      setEditorOpen(true);
      invalidateAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionLoading(false); }
  };

  // Stepper phases
  const PHASES: { key: ReservationWorkflowStatus; label: string }[] = [
    { key: 'draft', label: 'Borrador' },
    { key: 'pending_signature', label: 'Firma' },
    { key: 'signed', label: 'Firmada' },
    { key: 'converted', label: 'Convertida' },
  ];
  const currentPhaseIdx = PHASES.findIndex(p => p.key === wfStatus);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reservations')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              {reservation.reservation_number || 'Reserva (borrador)'}
            </h1>
            <Badge className={cn('text-xs border', RESERVATION_STATUS_COLORS[wfStatus])}>
              {RESERVATION_STATUS_LABELS[wfStatus]}
            </Badge>
            {isExpired && <Badge className="text-xs bg-destructive/15 text-destructive border-destructive/30">⚠ Vencida</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">Creada: {formatDate(reservation.reservation_date)}</p>
        </div>
      </div>

      {/* Workflow Stepper */}
      {!['cancelled', 'converted', 'expired'].includes(wfStatus) && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {PHASES.map((phase, idx) => {
            const isCompleted = currentPhaseIdx > idx;
            const isCurrent = currentPhaseIdx === idx;
            return (
              <div key={phase.key} className="flex items-center gap-1">
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  isCompleted && 'bg-primary/15 text-primary',
                  isCurrent && 'bg-primary text-primary-foreground',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                )}>
                  {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                  {phase.label}
                </div>
                {idx < PHASES.length - 1 && (
                  <div className={cn('h-px w-4 sm:w-8', isCompleted ? 'bg-primary' : 'bg-border')} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings */}
      {isExpired && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm text-destructive">
            Esta reserva ha superado su fecha límite. Puedes extenderla o cancelarla.
          </AlertDescription>
        </Alert>
      )}
      {!reservation.deposit_paid && wfStatus === 'signed' && (
        <Alert className="border-amber-500/50 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-700">
            La señal aún no ha sido cobrada. Se gestionará en la venta al convertir.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Vehicle Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4 text-primary" /> Vehículo</CardTitle></CardHeader>
            <CardContent>
              {vehicle ? (
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-base">{vehicle.brand} {vehicle.model}</p>
                  <p className="text-muted-foreground">{vehicle.version} · <span className="font-mono">{vehicle.plate}</span></p>
                  {vehicle.vin && <p className="text-muted-foreground text-xs">Bastidor: <span className="font-mono">{vehicle.vin}</span></p>}
                  <div className="flex gap-4 mt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">PVP</p>
                      <p className="font-bold text-primary">{formatCurrency(vehicle.pvp_base)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">PVP al crear reserva</p>
                      <p className="font-medium">{formatCurrency(reservation.vehicle_pvp_snapshot)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Km</p>
                      <p className="font-medium">{vehicle.km_entry?.toLocaleString('es-ES')} km</p>
                    </div>
                  </div>
                  <Link to={`/vehicles/${vehicle.id}`} className="text-xs text-primary underline hover:no-underline mt-1 inline-block">Ver ficha →</Link>
                </div>
              ) : <p className="text-sm text-muted-foreground">Cargando...</p>}
            </CardContent>
          </Card>

          {/* Client Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary" /> Cliente</CardTitle></CardHeader>
            <CardContent>
              {buyer ? (
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{buyer.name}{buyer.last_name ? ` ${buyer.last_name}` : ''}</p>
                  <p className="text-muted-foreground">{buyer.dni || '—'} · {buyer.phone || '—'}</p>
                  <p className="text-muted-foreground">{buyer.email || '—'}</p>
                  {buyer.address && <p className="text-muted-foreground text-xs">{buyer.address}</p>}
                  <Link to={`/clients/${buyer.id}`} className="text-xs text-primary underline hover:no-underline mt-1 inline-block">Ver ficha →</Link>
                </div>
              ) : <p className="text-sm text-muted-foreground">Cargando...</p>}
            </CardContent>
          </Card>

          {/* Signal / Deposit Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" /> Señal / Anticipo</CardTitle>
                <Badge variant="outline" className={cn('text-[10px] font-normal', reservation.deposit_amount_source === 'manual' ? 'border-amber-500/50 text-amber-700' : 'border-primary/50 text-primary')}>
                  {reservation.deposit_amount_source === 'manual' ? '✏️ Editado manualmente' : '🤖 Calculado automáticamente'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">Señal acordada</p>
                  <p className="text-2xl font-bold">{formatCurrency(reservation.reservation_amount)}</p>
                </div>
                {payments.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Cobrado neto</p>
                    <p className={cn('text-2xl font-bold', netPaid > 0 ? 'text-emerald-600' : 'text-muted-foreground')}>{formatCurrency(netPaid)}</p>
                  </div>
                )}
                {reservation.deposit_paid && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Señal cobrada
                  </Badge>
                )}
              </div>

              {reservation.payment_method && <p className="text-sm text-muted-foreground capitalize">Método: {METHOD_LABELS[reservation.payment_method] || reservation.payment_method}</p>}
              {reservation.notes && <p className="text-sm text-muted-foreground">Notas: {reservation.notes}</p>}

              {wfStatus === 'converted' && !reservation.applied_to_invoice && netPaid > 0 && (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 text-sm">
                    Señal de {formatCurrency(netPaid)} pendiente de aplicar a factura.
                  </AlertDescription>
                </Alert>
              )}

              {payments.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground">Movimientos de señal</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-xs text-right">Importe</TableHead>
                        <TableHead className="text-xs">Método</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>

          {/* Documents Card */}
          <ReservationDocumentsCard
            reservationId={reservation.id}
            onViewDocument={handleViewDocument}
            onGenerateDocument={isReadOnly ? undefined : handleGenerateDocument}
            loading={actionLoading}
          />

          {/* Timeline */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Historial</CardTitle></CardHeader>
            <CardContent>
              <ReservationTimeline reservationId={reservation.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Expiration Card */}
          <Card className={cn('border shadow-sm', isExpired && 'border-destructive/50')}>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Fecha límite</CardTitle></CardHeader>
            <CardContent>
              <p className={cn('text-lg font-bold', isExpired && 'text-destructive')}>
                {format(exp, 'dd/MM/yyyy HH:mm', { locale: es })}
              </p>
              {isExpired && <p className="text-sm text-destructive font-medium mt-1">⚠ Reserva vencida</p>}
              {!isExpired && hoursLeft <= 48 && hoursLeft > 0 && wfStatus === 'signed' && (
                <p className="text-sm text-amber-600 font-medium mt-1">⏰ Vence en {hoursLeft}h</p>
              )}
              {/* Signature timestamps */}
              {reservation.passed_to_signature_at && (
                <p className="text-xs text-muted-foreground mt-2">Pasada a firma: {formatDate(reservation.passed_to_signature_at)}</p>
              )}
              {reservation.signed_at && (
                <p className="text-xs text-muted-foreground">Firmada: {formatDate(reservation.signed_at)}</p>
              )}
              {reservation.converted_to_sale_at && (
                <p className="text-xs text-muted-foreground">Convertida en venta: {formatDate(reservation.converted_to_sale_at)}</p>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          {!isReadOnly && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Acciones</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {/* Pass to signature */}
                {wfStatus === 'draft' && (
                  <Button size="sm" className="w-full justify-start" onClick={() => setPassToSignOpen(true)} disabled={actionLoading}>
                    <Send className="h-4 w-4 mr-2" /> Pasar a firma
                  </Button>
                )}

                {/* Mark signed */}
                {wfStatus === 'pending_signature' && (
                  <Button size="sm" className="w-full justify-start" onClick={handleMarkSigned} disabled={actionLoading}>
                    <PenLine className="h-4 w-4 mr-2" /> Marcar como firmada
                  </Button>
                )}

                {/* Convert to sale */}
                {wfStatus === 'signed' && (
                  <Button size="sm" className="w-full justify-start" onClick={() => {
                    navigate(`/sales/new?vehicleId=${reservation.vehicle_id}&buyerId=${reservation.buyer_id}&reservationId=${reservation.id}`);
                  }}>
                    <ShoppingCart className="h-4 w-4 mr-2" /> Convertir en venta
                  </Button>
                )}

                {/* Extend */}
                {['expired', 'signed'].includes(wfStatus) && (
                  <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { setNewDate(addDays(new Date(), 3)); setExtendDialogOpen(true); }}>
                    <CalendarPlus className="h-4 w-4 mr-2" /> Extender plazo
                  </Button>
                )}

                {/* Recalculate deposit */}
                {['draft', 'pending_signature'].includes(wfStatus) && vehicle && (
                  <Button size="sm" variant="outline" className="w-full justify-start" onClick={handleRecalculateDeposit} disabled={actionLoading}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Recalcular al 3% del PVP
                  </Button>
                )}

                {/* Refund */}
                {wfStatus === 'signed' && netPaid > 0 && (
                  <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => { setPaymentRefund(true); setPaymentOpen(true); }}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Registrar devolución
                  </Button>
                )}

                {/* Mark expired */}
                {isExpired && wfStatus === 'signed' && (
                  <Button size="sm" variant="outline" className="w-full justify-start text-destructive" onClick={() => handleStatusChange('expired')}>
                    <AlertTriangle className="h-4 w-4 mr-2" /> Marcar vencida
                  </Button>
                )}

                {/* Cancel */}
                <Button size="sm" variant="outline" className="w-full justify-start text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelDialogOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" /> Cancelar reserva
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Documents quick access (sidebar) */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Generar documentos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => handleGenerateDocument('reservation_document')} disabled={actionLoading}>
                <FileText className="h-4 w-4 mr-2" /> Documento de reserva
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => handleGenerateDocument('deposit_receipt')} disabled={actionLoading || reservation.reservation_amount <= 0}>
                <FileText className="h-4 w-4 mr-2" /> Recibo de señal
              </Button>
              {['pending_signature', 'signed', 'converted'].includes(wfStatus) && (
                <>
                  <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => handleGenerateDocument('sales_contract')} disabled={actionLoading}>
                    <FileText className="h-4 w-4 mr-2" /> Contrato de compraventa
                  </Button>
                  <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => handleGenerateDocument('proforma_invoice')} disabled={actionLoading}>
                    <FileText className="h-4 w-4 mr-2" /> Factura proforma
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Extend dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Extender Reserva</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Nueva fecha límite:</p>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(newDate, 'dd/MM/yyyy', { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar mode="single" selected={newDate} onSelect={d => { if (d) { setNewDate(d); setCalendarOpen(false); } }} disabled={d => isBefore(d, startOfDay(new Date()))} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleExtend} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancelar Reserva</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">El vehículo volverá a estar disponible. ¿Motivo de cancelación?</p>
            <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Motivo opcional..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>No cancelar</Button>
            <Button variant="destructive" onClick={() => handleStatusChange('cancelled')} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sí, cancelar reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pass to signature dialog */}
      {passToSignOpen && (
        <PassToSignatureDialog
          open={passToSignOpen}
          onOpenChange={setPassToSignOpen}
          reservation={reservation}
          vehicle={vehicle || null}
          buyer={buyer || null}
          company={company || null}
          onConfirm={handlePassToSignature}
        />
      )}

      {/* Payment dialog */}
      {paymentOpen && buyer && (
        <PaymentDialog
          type="reserva"
          referenceId={reservation.id}
          vehicleId={reservation.vehicle_id}
          buyerId={reservation.buyer_id}
          totalAmount={reservation.reservation_amount}
          pendingAmount={Math.max(0, reservation.reservation_amount - netPaid)}
          isCobrada={false}
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          onSuccess={() => { setPaymentOpen(false); invalidateAll(); }}
        />
      )}


      {/* Document Editor */}
      {editorOpen && (
        <ContractEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          title={editorTitle}
          html={editorHtml}
          documentId={editorDocId}
          version={editorVersion}
        />
      )}
    </div>
  );
}
