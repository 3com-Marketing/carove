import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVehicleById, getExpenses, getNotes, updateVehicle, deleteVehicle, createExpense, updateExpense, deleteExpense, createNote, getAfterSaleTickets, createAfterSaleTicket, validateAfterSaleTicket, getBuyerById, updateBuyer, createBuyer, getProfiles, getSaleByVehicleId, getInvoicesByVehicle, getAuditLogsByVehicle, getSegments } from '@/lib/supabase-api';
import { supabase } from '@/integrations/supabase/client';
import SmartDocumentFlow from '@/components/smart-documents/SmartDocumentFlow';
import type { InvoiceData, DocRecord } from '@/components/smart-documents/SmartDocumentFlow';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentsTab } from '@/components/vehicles/DocumentsTab';
import { ProposalsTab } from '@/components/vehicles/ProposalsTab';
import { AppraisalTab } from '@/components/vehicles/AppraisalTab';
import { ImagesTab } from '@/components/vehicles/ImagesTab';
import { RepairOrderPanel } from '@/components/vehicles/RepairOrderPanel';
import { TransferPanel } from '@/components/vehicles/TransferPanel';
import { PreparationChecklist } from '@/components/vehicles/PreparationChecklist';
import { formatCurrency, formatKm, formatDate, daysInStock, BODY_TYPES } from '@/lib/constants';
import { useBranches } from '@/hooks/useBranches';
import { StatusBadge } from '@/components/vehicles/StatusBadge';
import MasterVehicleSelector from '@/components/vehicles/MasterVehicleSelector';
import type { MasterVehicleValues } from '@/components/vehicles/MasterVehicleSelector';
import { EditableField } from '@/components/vehicles/EditableField';
import { OwnerCard } from '@/components/vehicles/OwnerCard';
import { ExpenseDialog } from '@/components/vehicles/ExpenseDialog';
import { InvoiceDialog } from '@/components/invoices/InvoiceDialog';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle, XCircle, FileText, MessageSquare, ClipboardList, Receipt, ShieldCheck, Car, Loader2, Pencil, Save, X, Plus, Trash2, Check, Ban, AlertTriangle, Sparkles, PlusCircle, FileSearch, History, Wrench, ArrowLeftRight, Shield, Scale, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Vehicle, Expense, AfterSaleTicket, Buyer, Sale, Invoice, AuditLog } from '@/lib/types';
import { getInsuranceStatus, InsuranceBadge } from '@/components/vehicles/InsuranceSection';
import type { VehicleInsurance } from '@/lib/types';
import { differenceInDays } from 'date-fns';

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: branches = [] } = useBranches();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { has, isAdmin } = useRole();
  const qc = useQueryClient();

  const { data: vehicle, isLoading } = useQuery({ queryKey: ['vehicle', id], queryFn: () => getVehicleById(id || ''), enabled: !!id });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses', id], queryFn: () => getExpenses(id), enabled: !!id });
  const { data: notes = [] } = useQuery({ queryKey: ['notes', id], queryFn: () => getNotes(id), enabled: !!id });
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets', id], queryFn: () => getAfterSaleTickets(id!), enabled: !!id });
  const { data: buyer } = useQuery({ queryKey: ['buyer', vehicle?.buyer_id], queryFn: () => getBuyerById(vehicle!.buyer_id!), enabled: !!vehicle?.buyer_id });
  const { data: profiles = [] } = useQuery({ queryKey: ['profiles'], queryFn: getProfiles });
  const { data: sale } = useQuery({ queryKey: ['sale-vehicle', id], queryFn: () => getSaleByVehicleId(id!), enabled: !!id && ['vendido', 'entregado'].includes(vehicle?.status || '') });
  const { data: vehicleInvoices = [] } = useQuery({ queryKey: ['invoices-vehicle', id], queryFn: () => getInvoicesByVehicle(id!), enabled: !!id && ['vendido', 'entregado'].includes(vehicle?.status || '') });
  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery({ queryKey: ['audit-vehicle', id], queryFn: () => getAuditLogsByVehicle(id!, 50), enabled: !!id });

  // Insurance query for header badge + delivery block
  const { data: vehicleInsurances = [] } = useQuery({
    queryKey: ['vehicle-insurances', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicle_insurances').select('*').eq('vehicle_id', id!).order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as VehicleInsurance[];
    },
    enabled: !!id,
  });
  const activeInsurance = vehicleInsurances.find(ins => getInsuranceStatus(ins) === 'activo');
  const insuranceDaysLeft = activeInsurance ? differenceInDays(new Date(activeInsurance.end_date), new Date()) : undefined;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Vehicle>>({});
  const [saving, setSaving] = useState(false);

  // Master vehicle selector state for editing
  const [masterValues, setMasterValues] = useState<MasterVehicleValues>({
    master_brand_id: '', master_model_id: '', master_version_id: '',
    body_type: '', segment_id: '', brand: '', model: '', version: '',
  });

  // Segments for read-only display
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: getSegments });

  // ── Expense dialog ──
  const [expenseMode, setExpenseMode] = useState<'closed' | 'select' | 'manual' | 'ai'>('closed');
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [expSaving, setExpSaving] = useState(false);

  // ── Note ──
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // ── Postventa ──
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSaving, setTicketSaving] = useState(false);

  // ── Facturación ──
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  // Owner client for appraisal tab
  const { data: ownerBuyer } = useQuery({
    queryKey: ['buyer', vehicle?.owner_client_id],
    queryFn: () => getBuyerById(vehicle!.owner_client_id!),
    enabled: !!vehicle?.owner_client_id,
  });


  const startEdit = () => {
    if (vehicle) {
      setDraft({ ...vehicle });
      setMasterValues({
        master_brand_id: vehicle.master_brand_id || '',
        master_model_id: vehicle.master_model_id || '',
        master_version_id: vehicle.master_version_id || '',
        body_type: vehicle.body_type || '',
        segment_id: vehicle.segment_id || '',
        brand: vehicle.brand,
        model: vehicle.model,
        version: vehicle.version,
      });
      setEditing(true);
    }
  };

  const cancelEdit = () => { setEditing(false); setDraft({}); };

  const setD = (key: string, value: string | boolean | number) => setDraft(p => ({ ...p, [key]: value }));

  const saveVehicle = async () => {
    if (!user || !id) return;

    // Delivery block: check insurance before allowing status change to "entregado"
    const newStatus = (draft as any).status;
    if (newStatus === 'entregado' && vehicle.status !== 'entregado' && !vehicle.is_deregistered) {
      if (!activeInsurance) {
        toast({ title: '❌ No se puede entregar', description: 'No se puede entregar un vehículo sin seguro activo.', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      const numFields = ['displacement', 'horsepower', 'km_entry', 'km_exit', 'purchase_price', 'pvp_base', 'price_professionals', 'price_financed', 'price_cash', 'tax_rate', 'irpf_rate', 'discount'];
      const cleaned: any = { ...draft };
      numFields.forEach(f => { if (cleaned[f] !== undefined) cleaned[f] = Number(cleaned[f]) || 0; });
      if (cleaned.sold_by === '_none') cleaned.sold_by = null;
      // Sync master data into draft
      cleaned.master_brand_id = masterValues.master_brand_id || null;
      cleaned.master_model_id = masterValues.master_model_id || null;
      cleaned.master_version_id = masterValues.master_version_id || null;
      cleaned.segment_id = masterValues.segment_id || null;
      cleaned.body_type = masterValues.body_type || null;
      cleaned.brand = masterValues.brand || cleaned.brand;
      cleaned.model = masterValues.model || cleaned.model;
      cleaned.version = masterValues.version || cleaned.version;
      cleaned.segment_auto_assigned = true;
      // total_cost y net_profit se calculan por triggers en BD
      delete cleaned.total_cost; delete cleaned.net_profit; delete cleaned.total_expenses;
      delete cleaned.id; delete cleaned.created_at; delete cleaned.created_by;
      await updateVehicle(id, cleaned, user.id);
      qc.invalidateQueries({ queryKey: ['vehicle', id] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      setEditing(false);
      toast({ title: '✅ Vehículo actualizado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeleteVehicle = async () => {
    if (!id) return;
    try {
      await deleteVehicle(id);
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast({ title: '🗑️ Vehículo eliminado' });
      navigate('/vehicles');
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  // ── Expense handlers ──
  const handleSaveExpense = async (data: Partial<Expense>) => {
    if (!user || !id) return;
    setExpSaving(true);
    try {
      if (editingExp) {
        await updateExpense(editingExp.id, data, user.id);
      } else {
        await createExpense({ ...data, vehicle_id: id }, user.id);
      }
      qc.invalidateQueries({ queryKey: ['expenses', id] });
      qc.invalidateQueries({ queryKey: ['vehicle', id] });
      setExpenseMode('closed');
      setEditingExp(null);
      toast({ title: editingExp ? '✅ Gasto actualizado' : '✅ Gasto creado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setExpSaving(false); }
  };

  const handleDeleteExpense = async (expId: string) => {
    try {
      await deleteExpense(expId);
      qc.invalidateQueries({ queryKey: ['expenses', id] });
      toast({ title: '🗑️ Gasto eliminado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  // ── Note handler ──
  const handlePublishNote = async () => {
    if (!user || !id || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      await createNote({ vehicle_id: id, content: noteText.trim(), author_name: user.email || 'Usuario' }, user.id);
      qc.invalidateQueries({ queryKey: ['notes', id] });
      setNoteText('');
      toast({ title: '✅ Nota publicada' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally { setNoteSaving(false); }
  };

  // ── AI Expense handler ──
  const handleConfirmExpenseAI = async (data: InvoiceData, docRecord: DocRecord) => {
    if (!user || !id) return;
    const expense = await createExpense({
      vehicle_id: id,
      date: data.fecha_factura || new Date().toISOString(),
      amount: data.total,
      base_amount: data.base_imponible,
      tax_type: data.impuesto_tipo === 'IVA' ? 'iva' : 'igic',
      tax_rate: data.impuesto_porcentaje,
      tax_amount: data.impuesto_importe,
      description: data.descripcion || 'Gasto desde factura PDF',
      supplier_name: data.proveedor_nombre,
      invoice_number: data.numero_factura,
    }, user.id);

    await supabase
      .from('smart_documents')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        linked_entity_type: 'expense',
        linked_entity_id: expense.id,
        linked_vehicle_id: id,
      })
      .eq('id', docRecord.id);

    qc.invalidateQueries({ queryKey: ['expenses', id] });
    qc.invalidateQueries({ queryKey: ['vehicle', id] });
    setExpenseMode('closed');
    toast({ title: '✅ Gasto creado desde factura IA' });
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  if (!vehicle) return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <Car className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground mb-4">Vehículo no encontrado</p>
      <Button variant="outline" onClick={() => navigate('/vehicles')}>Volver al stock</Button>
    </div>
  );

  const dias = daysInStock(vehicle.expo_date);
  const e = editing;
  const d = draft as any;
  const v = vehicle as any;

  const f = (label: string, key: string, opts?: { type?: 'text' | 'number' | 'date' | 'select' | 'boolean'; options?: { value: string; label: string }[]; render?: React.ReactNode }) => (
    <EditableField
      label={label}
      value={opts?.render ?? (opts?.type === 'boolean' ? (
        <span className="flex items-center gap-1">
          {v[key] ? <CheckCircle className="h-4 w-4 text-status-disponible" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
          {v[key] ? 'Sí' : 'No'}
        </span>
      ) : opts?.type === 'date' ? formatDate(v[key]) : opts?.type === 'number' ? (key.includes('price') || key.includes('purchase') || key.includes('pvp') || key.includes('discount') || key.includes('cost') || key.includes('profit') || key.includes('expense') || key.includes('policy_amount') ? formatCurrency(Number(v[key]) || 0) : key.includes('km') ? formatKm(Number(v[key]) || 0) : String(v[key] ?? '')) : (
        <span className={key === 'vin' ? 'font-mono text-xs' : key === 'vehicle_class' || key === 'vehicle_type' || key === 'engine_type' || key === 'transmission' ? 'capitalize' : ''}>
          {v[key] ?? '—'}
        </span>
      ))}
      editing={e}
      type={opts?.type || 'text'}
      editValue={d[key] ?? v[key] ?? ''}
      onChange={val => setD(key, val)}
      options={opts?.options}
    />
  );

  const statusOptions = [
    { value: 'no_disponible', label: 'No disponible' },
    { value: 'disponible', label: 'Disponible' }, { value: 'reservado', label: 'Reservado' },
    { value: 'vendido', label: 'Vendido' }, { value: 'entregado', label: 'Entregado' },
  ];
  const classOptions = [{ value: 'turismo', label: 'Turismo' }, { value: 'mixto', label: 'Mixto' }, { value: 'industrial', label: 'Industrial' }];
  const typeOptions = [{ value: 'nuevo', label: 'Nuevo' }, { value: 'ocasion', label: 'Ocasión' }, { value: 'usado', label: 'Usado' }];
  const engineOptions = [{ value: 'gasolina', label: 'Gasolina' }, { value: 'diesel', label: 'Diésel' }, { value: 'hibrido', label: 'Híbrido' }, { value: 'electrico', label: 'Eléctrico' }];
  const transOptions = [{ value: 'manual', label: 'Manual' }, { value: 'automatico', label: 'Automático' }];
  const taxOptions = [{ value: 'igic', label: 'IGIC' }, { value: 'iva', label: 'IVA' }];
  const centerOptions = (branches || []).map(c => ({ value: c, label: c }));

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Banner: No disponible */}
      {vehicle.status === 'no_disponible' && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
            Este vehículo no está disponible para venta. Complete el proceso de compra para activarlo.
            <Button
              variant="link"
              size="sm"
              className="text-amber-700 dark:text-amber-400 px-1 h-auto"
              onClick={async () => {
                const { data: purchase } = await supabase
                  .from('vehicle_purchases')
                  .select('id')
                  .eq('vehicle_id', vehicle.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (purchase?.id) navigate(`/purchases/${purchase.id}`);
                else toast({ title: 'No se encontró la compra vinculada', variant: 'destructive' });
              }}
            >
              Ir al proceso de compra →
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')} aria-label="Volver" className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">{vehicle.brand} {vehicle.model}</h1>
              <StatusBadge status={vehicle.status} />
              {activeInsurance ? (
                <InsuranceBadge status={getInsuranceStatus(activeInsurance)} daysLeft={insuranceDaysLeft} />
              ) : vehicleInsurances.length > 0 ? (
                <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">❌ Seguro caducado</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground"><Shield className="h-3 w-3 mr-1" />Sin seguro</Badge>
              )}
              {dias > 90 && vehicle.status === 'disponible' && <Badge variant="outline" className="text-status-vendido border-status-vendido/30 text-xs">⏰ {dias} días</Badge>}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{vehicle.version} · {vehicle.plate} · {vehicle.center}</p>
          </div>
        </div>
        <div className="flex gap-2 pl-11 sm:pl-0 shrink-0">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}><X className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Cancelar</span></Button>
              <Button size="sm" onClick={saveVehicle} disabled={saving}><Save className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar'}</span></Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={startEdit}><Pencil className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Editar</span></Button>
              {has('delete:vehicle') && (
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Eliminar</span></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>¿Eliminar vehículo?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará {vehicle.brand} {vehicle.model} ({vehicle.plate}).</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteVehicle}>Eliminar</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="datos" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max md:w-full justify-start bg-muted/50 h-auto">
            <TabsTrigger value="datos" className="text-xs py-2.5 touch-manipulation">Datos</TabsTrigger>
            <TabsTrigger value="tasacion" className="text-xs py-2.5 touch-manipulation"><Scale className="h-3 w-3 mr-1" />Tasación</TabsTrigger>
            {(vehicle as any).preparation_status && <TabsTrigger value="preparacion" className="text-xs py-2.5 touch-manipulation"><ClipboardCheck className="h-3 w-3 mr-1" />Preparación</TabsTrigger>}
            <TabsTrigger value="ventas" className="text-xs py-2.5 touch-manipulation">Venta</TabsTrigger>
            <TabsTrigger value="gastos" className="text-xs py-2.5 touch-manipulation">Gastos</TabsTrigger>
            <TabsTrigger value="reparaciones" className="text-xs py-2.5 touch-manipulation"><Wrench className="h-3 w-3 mr-1" />Reparaciones</TabsTrigger>
            <TabsTrigger value="movimientos" className="text-xs py-2.5 touch-manipulation"><ArrowLeftRight className="h-3 w-3 mr-1" />Movimientos</TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs py-2.5 touch-manipulation">Docs</TabsTrigger>
            <TabsTrigger value="imagenes" className="text-xs py-2.5 touch-manipulation">📷 Imágenes</TabsTrigger>
            <TabsTrigger value="propuestas" className="text-xs py-2.5 touch-manipulation">Propuestas</TabsTrigger>
            <TabsTrigger value="postventa" className="text-xs py-2.5 touch-manipulation">Postventa</TabsTrigger>
            <TabsTrigger value="notas" className="text-xs py-2.5 touch-manipulation">Notas</TabsTrigger>
            <TabsTrigger value="historial" className="text-xs py-2.5 touch-manipulation"><History className="h-3 w-3 mr-1" />Historial</TabsTrigger>
          </TabsList>
        </div>

        {/* ── DATOS ── */}
        <TabsContent value="datos" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Identificación</CardTitle></CardHeader>
              <CardContent className={editing ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-0'}>
                {editing ? (
                  <>
                    {f('Matrícula', 'plate')}
                    {f('VIN / Chasis', 'vin')}
                    <MasterVehicleSelector
                      values={masterValues}
                      onChange={(partial) => setMasterValues(prev => ({ ...prev, ...partial }))}
                      userId={user?.id || ''}
                      color={d.color ?? v.color ?? ''}
                      onColorChange={(c) => setD('color', c)}
                    />
                  </>
                ) : (
                  <>
                    {f('Matrícula', 'plate')}
                    {f('VIN / Chasis', 'vin')}
                    <EditableField label="Marca" value={v.brand || '—'} />
                    <EditableField label="Modelo" value={v.model || '—'} />
                    <EditableField label="Carrocería" value={BODY_TYPES.find(bt => bt.value === v.body_type)?.label || v.body_type || '—'} />
                    <EditableField label="Segmento" value={(() => { const seg = segments.find(s => s.id === v.segment_id); return seg ? `${seg.code} — ${seg.name}` : '—'; })()} />
                    <EditableField label="Versión" value={v.version || '—'} />
                    <EditableField label="Color" value={v.color || '—'} />
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Técnico</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                {f('Clase', 'vehicle_class', { type: 'select', options: classOptions })}
                {f('Tipo', 'vehicle_type', { type: 'select', options: typeOptions })}
                {f('Motor', 'engine_type', { type: 'select', options: engineOptions })}
                {f('Cambio', 'transmission', { type: 'select', options: transOptions })}
                {f('Cilindrada', 'displacement', { type: 'number' })}
                {f('Potencia', 'horsepower', { type: 'number' })}
                {f('KM entrada', 'km_entry', { type: 'number' })}
                {f('KM salida', 'km_exit', { type: 'number' })}
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Fechas</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                {f('1ª Matriculación', 'first_registration', { type: 'date' })}
                {f('2ª Matriculación', 'second_registration', { type: 'date' })}
                {f('Garantía Oficial', 'warranty_date', { type: 'date' })}
                {f('ITV', 'itv_date', { type: 'date' })}
                {f('Fecha compra', 'purchase_date', { type: 'date' })}
                {f('Fecha exposición', 'expo_date', { type: 'date' })}
                {f('Fecha venta', 'sale_date', { type: 'date' })}
                {f('Fecha entrega', 'delivery_date', { type: 'date' })}
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Documentación</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                {f('2ª Llave', 'has_second_key', { type: 'boolean' })}
                {f('Ficha Técnica', 'has_technical_sheet', { type: 'boolean' })}
                {f('Permiso Circulación', 'has_circulation_permit', { type: 'boolean' })}
                {f('Manual', 'has_manual', { type: 'boolean' })}
                {editing ? (
                  <EditableField label="Centro" value={vehicle.center} />
                ) : (
                  f('Centro', 'center', { type: 'select', options: centerOptions })
                )}
                {editing && <p className="text-[10px] text-muted-foreground px-1 -mt-1">Solo cambia mediante traspaso formal</p>}
                {f('Lote', 'lot')}
                {f('Estado', 'status', { type: 'select', options: statusOptions, render: <StatusBadge status={vehicle.status} /> })}
              </CardContent>
            </Card>
            <OwnerCard
              ownerClientId={editing ? (draft as any).owner_client_id ?? vehicle.owner_client_id ?? null : vehicle.owner_client_id ?? null}
              editing={editing}
              onOwnerChange={(ownerId) => setD('owner_client_id', ownerId as any)}
            />
          </div>
        </TabsContent>

        {/* ── TASACIÓN ── */}
        <TabsContent value="tasacion" className="mt-4">
          <AppraisalTab vehicle={vehicle} owner={ownerBuyer || null} />
        </TabsContent>

        {/* ── PREPARACIÓN ── */}
        {(vehicle as any).preparation_status && (
          <TabsContent value="preparacion" className="mt-4">
            <PreparationChecklist vehicleId={vehicle.id} />
          </TabsContent>
        )}

        {/* ── VENTAS ── */}
        <TabsContent value="ventas" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Precios</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                {f('PVP Base', 'pvp_base', { type: 'number' })}
                {f('Precio Profesionales', 'price_professionals', { type: 'number' })}
                {f('Precio Financiado', 'price_financed', { type: 'number' })}
                {f('Precio Contado', 'price_cash', { type: 'number' })}
                {f('Impuesto', 'tax_type', { type: 'select', options: taxOptions, render: <span>{vehicle.tax_type.toUpperCase()} {vehicle.tax_rate}%</span> })}
                {f('% Impuesto', 'tax_rate', { type: 'number' })}
                {f('IRPF', 'irpf_rate', { type: 'number' })}
                {f('Descuento', 'discount', { type: 'number' })}
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Rentabilidad</CardTitle></CardHeader>
              <CardContent className="space-y-0">
                {f('Precio de compra', 'purchase_price', { type: 'number' })}
                {f('Total gastos', 'total_expenses', { type: 'number' })}
                <EditableField label="Costo total" value={<strong>{formatCurrency(vehicle.total_cost)}</strong>} />
                <EditableField label="Beneficio neto" value={<strong className={cn(vehicle.net_profit >= 0 ? 'text-status-disponible' : 'text-destructive')}>{formatCurrency(vehicle.net_profit)}</strong>} />
                {f('Vendido por', 'sold_by', { type: 'select', options: [{ value: '_none', label: '— Sin asignar —' }, ...profiles.map(p => ({ value: p.full_name || p.email, label: p.full_name || p.email }))] })}
              </CardContent>
            </Card>

            {/* ── FACTURACIÓN ── */}
            {['vendido', 'entregado'].includes(vehicle.status) && (() => {
              const emittedInvoice = vehicleInvoices.find((inv: Invoice) => inv.status === 'emitida' || inv.status === 'rectificada');
              const missingFiscalData = buyer && (!buyer.dni || !buyer.address);
              const canEmit = !!buyer && !!sale && (sale.total_amount || 0) > 0 && !emittedInvoice;

              return (
                <Card className="border shadow-sm lg:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Facturación</CardTitle></CardHeader>
                  <CardContent>
                    {emittedInvoice ? (
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-status-disponible" />
                        <div className="text-sm space-y-0.5">
                          <p className="font-medium">Factura emitida</p>
                          <p>
                            Número:{' '}
                            <Link to={`/invoices/${emittedInvoice.id}`} className="text-primary underline hover:no-underline font-mono">
                              {emittedInvoice.full_number}
                            </Link>
                          </p>
                          <p className="text-muted-foreground">Fecha: {formatDate(emittedInvoice.issue_date)} · Total: {formatCurrency(emittedInvoice.total_amount)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {missingFiscalData && (
                          <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                              Faltan datos fiscales del cliente. Revise antes de emitir.
                            </AlertDescription>
                          </Alert>
                        )}
                        <Button
                          onClick={() => setInvoiceDialogOpen(true)}
                          disabled={!canEmit}
                        >
                          <Receipt className="h-4 w-4 mr-1" /> Emitir factura
                        </Button>
                        {!buyer && <p className="text-xs text-muted-foreground">Asigne un comprador antes de facturar.</p>}
                        {sale && (sale.total_amount || 0) === 0 && <p className="text-xs text-muted-foreground">El precio de venta debe ser mayor que 0.</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            <Card className="border shadow-sm lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Comprador</CardTitle></CardHeader>
              <CardContent>
                {buyer ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                    <EditableField label="Nombre / Razón social" value={buyer.name} />
                    <EditableField label="DNI / NIE" value={buyer.dni || '—'} />
                    <EditableField label="Código cliente" value={buyer.client_code || '—'} />
                    <EditableField label="Teléfono" value={buyer.phone || '—'} />
                    <EditableField label="Email" value={buyer.email || '—'} />
                    <EditableField label="IBAN" value={buyer.iban || '—'} />
                    <EditableField label="Dirección" value={buyer.address || '—'} />
                    <EditableField label="Población" value={buyer.city || '—'} />
                    <EditableField label="CP" value={buyer.postal_code || '—'} />
                    <EditableField label="Provincia" value={buyer.province || '—'} />
                    <EditableField label="Nº Factura" value={buyer.invoice_number || '—'} />
                    <EditableField label="Fecha Factura" value={buyer.invoice_date ? formatDate(buyer.invoice_date) : '—'} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin comprador asignado.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── GASTOS ── */}
        <TabsContent value="gastos" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Gastos y Reparaciones</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Total: {formatCurrency(vehicle.total_expenses)}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setExpenseMode('select')}><Plus className="h-3 w-3 mr-1" /> Nuevo</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin gastos registrados.</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Acreedor</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Nº Factura</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                          <TableHead>Finalización</TableHead>
                          <TableHead>Cortesía</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map(exp => (
                          <TableRow key={exp.id}>
                            <TableCell className="text-xs">{formatDate(exp.date)}</TableCell>
                            <TableCell className="text-xs font-medium">{exp.supplier_name || exp.supplier_id}</TableCell>
                            <TableCell className="text-xs">{exp.description}</TableCell>
                            <TableCell className="text-xs font-mono">{exp.invoice_number}</TableCell>
                            <TableCell className="text-right text-xs font-semibold">{formatCurrency(exp.amount)}</TableCell>
                            <TableCell className="text-xs">{exp.completion_date ? formatDate(exp.completion_date) : <Badge variant="outline" className="text-[10px]">Pendiente</Badge>}</TableCell>
                            <TableCell className="text-xs">
                              {exp.courtesy_vehicle_plate ? (
                                <Badge variant="outline" className="text-[10px]">🚗 {exp.courtesy_vehicle_plate}</Badge>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingExp(exp); setExpenseMode('manual'); }}><Pencil className="h-3 w-3" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle><AlertDialogDescription>Se eliminará este gasto permanentemente.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(exp.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {expenses.map(exp => (
                      <div key={exp.id} className="rounded-lg border p-3 bg-muted/20">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium">{exp.supplier_name || exp.supplier_id}</p>
                            <p className="text-xs text-muted-foreground">{exp.description}</p>
                          </div>
                          <span className="text-sm font-semibold shrink-0">{formatCurrency(exp.amount)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <span>Fecha: <strong className="text-foreground">{formatDate(exp.date)}</strong></span>
                          <span>Factura: <strong className="text-foreground font-mono">{exp.invoice_number}</strong></span>
                          <span>Estado: {exp.completion_date ? <strong className="text-foreground">{formatDate(exp.completion_date)}</strong> : <Badge variant="outline" className="text-[10px]">Pendiente</Badge>}</span>
                          {exp.courtesy_vehicle_plate && <span>Cortesía: <Badge variant="outline" className="text-[10px]">🚗 {exp.courtesy_vehicle_plate}</Badge></span>}
                        </div>
                        <div className="flex gap-2 mt-2 pt-2 border-t">
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setEditingExp(exp); setExpenseMode('manual'); }}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 text-xs text-destructive"><Trash2 className="h-3 w-3 mr-1" /> Eliminar</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle><AlertDialogDescription>Se eliminará este gasto permanentemente.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(exp.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <ExpenseDialog open={expenseMode === 'manual'} onClose={() => { setExpenseMode('closed'); setEditingExp(null); }} onSave={handleSaveExpense} expense={editingExp} saving={expSaving} />

          {/* Expense Mode Selector Dialog */}
          <Dialog open={expenseMode === 'select'} onOpenChange={v => !v && setExpenseMode('closed')}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nuevo Gasto</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">¿Cómo quieres registrar el gasto?</p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  onClick={() => { setEditingExp(null); setExpenseMode('manual'); }}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent/50 transition-all cursor-pointer"
                >
                  <PlusCircle className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Crear manualmente</span>
                  <span className="text-xs text-muted-foreground text-center">Rellenar formulario de gasto</span>
                </button>
                <button
                  onClick={() => setExpenseMode('ai')}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent/50 transition-all cursor-pointer"
                >
                  <Sparkles className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Desde factura PDF</span>
                  <span className="text-xs text-muted-foreground text-center">Extraer datos con IA</span>
                </button>
              </div>
            </DialogContent>
          </Dialog>

          {/* AI Expense Dialog */}
          <Dialog open={expenseMode === 'ai'} onOpenChange={v => !v && setExpenseMode('closed')}>
            <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0">
              <SmartDocumentFlow
                documentType="expense_invoice"
                vehicleId={id}
                hideVehicleMatch
                onConfirmInvoice={handleConfirmExpenseAI}
                onCancel={() => setExpenseMode('closed')}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── REPARACIONES ── */}
        <TabsContent value="reparaciones" className="mt-4">
          <RepairOrderPanel vehicleId={id!} />
        </TabsContent>

        {/* ── MOVIMIENTOS (Traspasos) ── */}
        <TabsContent value="movimientos" className="mt-4">
          <TransferPanel vehicleId={id!} currentBranch={vehicle.center} />
        </TabsContent>

        {/* ── DOCUMENTOS ── */}
        <TabsContent value="documentos" className="mt-4">
          <DocumentsTab vehicleId={id!} />
        </TabsContent>

        {/* ── IMÁGENES ── */}
        <TabsContent value="imagenes" className="mt-4">
          <ImagesTab vehicleId={vehicle.id} />
        </TabsContent>

        {/* ── PROPUESTAS ── */}
        <TabsContent value="propuestas" className="mt-4">
          <ProposalsTab vehicle={vehicle} />
        </TabsContent>

        {/* ── POSTVENTA ── */}
        <TabsContent value="postventa" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Solicitudes Postventa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {has('manage:postventa') && (
                <div className="flex gap-2">
                  <Textarea value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} placeholder="Describe la solicitud postventa..." className="text-sm min-h-[60px] flex-1" />
                  <Button className="self-end" disabled={ticketSaving || !ticketDesc.trim()} onClick={async () => {
                    if (!user || !id) return;
                    setTicketSaving(true);
                    try {
                      await createAfterSaleTicket({ vehicle_id: id, task_description: ticketDesc.trim(), requested_by: user.id, requested_by_name: profile?.full_name || user.email || '' });
                      qc.invalidateQueries({ queryKey: ['tickets', id] });
                      setTicketDesc('');
                      toast({ title: '✅ Solicitud creada' });
                    } catch (e: any) { toast({ title: '❌ Error', description: e.message, variant: 'destructive' }); }
                    finally { setTicketSaving(false); }
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Crear
                  </Button>
                </div>
              )}
              {tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin solicitudes postventa.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map(t => {
                      const isPending = t.validation_status === 'pendiente';
                      const isOwnTicket = user?.id === t.requested_by;
                      const canValidate = has('validate:postventa') && !isOwnTicket && isPending;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{formatDate(t.request_date)}</TableCell>
                          <TableCell className="text-xs font-medium">{t.requested_by_name || '—'}</TableCell>
                          <TableCell className="text-xs">{t.task_description}</TableCell>
                          <TableCell>
                            <Badge variant={t.validation_status === 'validado' ? 'default' : t.validation_status === 'rechazado' ? 'destructive' : 'outline'} className="text-[10px] capitalize">
                              {t.validation_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {canValidate && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-status-disponible" onClick={async () => {
                                  try {
                                    await validateAfterSaleTicket(t.id, 'validado', user!.id);
                                    qc.invalidateQueries({ queryKey: ['tickets', id] });
                                    toast({ title: '✅ Ticket validado' });
                                  } catch (e: any) {
                                    toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
                                  }
                                }}><Check className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={async () => {
                                  try {
                                    await validateAfterSaleTicket(t.id, 'rechazado', user!.id);
                                    qc.invalidateQueries({ queryKey: ['tickets', id] });
                                    toast({ title: '❌ Ticket rechazado' });
                                  } catch (e: any) {
                                    toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
                                  }
                                }}><Ban className="h-3 w-3" /></Button>
                              </div>
                            )}
                            {isPending && isOwnTicket && has('validate:postventa') && (
                              <span className="text-[10px] text-muted-foreground italic">No puedes validar tus propias tareas</span>
                            )}
                            {!isPending && (
                              <span className="text-[10px] text-muted-foreground">{t.validation_date ? formatDate(t.validation_date) : ''}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NOTAS ── */}
        <TabsContent value="notas" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Notas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escribe una nota..." className="text-sm min-h-[60px] flex-1" />
                <Button onClick={handlePublishNote} disabled={noteSaving || !noteText.trim()} className="self-end">
                  <MessageSquare className="h-4 w-4 mr-1" /> Publicar
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin notas aún.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map(n => (
                    <div key={n.id} className="rounded-lg border p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{n.author_name || 'Usuario'}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(n.created_at)}</span>
                      </div>
                      <p className="text-sm">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── HISTORIAL ── */}
        <TabsContent value="historial" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Historial de Auditoría</CardTitle></CardHeader>
            <CardContent>
              {loadingAudit ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin registros de auditoría para este vehículo.</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                      <div className="mt-0.5">
                        <Badge variant={log.action === 'DELETE' ? 'destructive' : log.action === 'INSERT' ? 'default' : 'outline'} className={cn('text-[10px]', log.action === 'INSERT' && 'bg-status-disponible text-white', log.action === 'UPDATE' && ((log.summary || '').includes('Estado') ? 'bg-status-reservado text-white border-status-reservado' : ''))}>
                          {log.action === 'INSERT' ? 'Crear' : log.action === 'UPDATE' ? ((log.summary || '').includes('Estado') ? 'Estado' : 'Editar') : log.action === 'DELETE' ? 'Eliminar' : log.action}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{log.summary || 'Acción registrada'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('es-ES')}</span>
                          {log.actor_name && <span className="text-xs font-medium">· {log.actor_name}</span>}
                          {log.entity_type && <Badge variant="outline" className="text-[9px] capitalize">{log.entity_type}</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {sale && buyer && invoiceDialogOpen && (
        <InvoiceDialog
          sale={sale}
          buyerName={buyer.name}
          vehicleInfo={`${vehicle.brand} ${vehicle.model} — ${vehicle.plate}`}
          open={invoiceDialogOpen}
          onClose={() => setInvoiceDialogOpen(false)}
          onSuccess={() => {
            setInvoiceDialogOpen(false);
            qc.invalidateQueries({ queryKey: ['sale-vehicle', id] });
            qc.invalidateQueries({ queryKey: ['invoices-vehicle', id] });
            qc.invalidateQueries({ queryKey: ['vehicle', id] });
          }}
        />
      )}
    </div>
  );
}
