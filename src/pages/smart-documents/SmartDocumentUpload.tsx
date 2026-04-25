import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createVehicle, createExpense, uploadDocument } from '@/lib/supabase-api';
import { BRANDS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Receipt, Car, Upload, Loader2, Sparkles, AlertTriangle, ArrowLeft, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type DocType = 'expense_invoice' | 'vehicle_technical_sheet';
type Step = 'select' | 'uploading' | 'review';

interface InvoiceData {
  proveedor_nombre: string;
  proveedor_nif: string;
  numero_factura: string;
  fecha_factura: string;
  descripcion: string;
  base_imponible: number;
  impuesto_tipo: string;
  impuesto_porcentaje: number;
  impuesto_importe: number;
  total: number;
  posible_matricula_detectada: string;
}

interface VehicleData {
  matricula: string;
  vin: string;
  marca: string;
  modelo: string;
  version: string;
  fecha_primera_matriculacion: string;
  combustible: string;
  potencia: number;
  cilindrada: number;
  color: string;
  numero_homologacion: string;
}

interface DocRecord {
  id: string;
  file_path: string;
  file_name: string;
}

const EMPTY_INVOICE: InvoiceData = {
  proveedor_nombre: '', proveedor_nif: '', numero_factura: '', fecha_factura: '',
  descripcion: '', base_imponible: 0, impuesto_tipo: 'IGIC', impuesto_porcentaje: 7,
  impuesto_importe: 0, total: 0, posible_matricula_detectada: '',
};

const EMPTY_VEHICLE: VehicleData = {
  matricula: '', vin: '', marca: '', modelo: '', version: '',
  fecha_primera_matriculacion: '', combustible: 'gasolina', potencia: 0,
  cilindrada: 0, color: '', numero_homologacion: '',
};

// Validation helpers
function validateVin(vin: string): string | null {
  if (!vin) return null;
  const clean = vin.toUpperCase().replace(/\s/g, '');
  if (clean.length !== 17) return 'El VIN debe tener exactamente 17 caracteres';
  if (/[IOQ]/.test(clean)) return 'El VIN no puede contener I, O ni Q';
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(clean)) return 'Formato de VIN inválido';
  return null;
}

function validatePlate(plate: string): string | null {
  if (!plate) return null;
  const clean = plate.toUpperCase().replace(/[\s-]/g, '');
  const modern = /^\d{4}[A-Z]{3}$/.test(clean);
  const old = /^[A-Z]{1,2}\d{4}[A-Z]{2,3}$/.test(clean);
  if (!modern && !old) return 'Formato de matrícula no reconocido';
  return null;
}

function AiLabel({ children, hasAiValue }: { children: React.ReactNode; hasAiValue: boolean }) {
  return (
    <Label className="flex items-center gap-1.5">
      {children}
      {hasAiValue && <Sparkles className="h-3 w-3 text-primary" />}
    </Label>
  );
}

export default function SmartDocumentUpload() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select');
  const [docType, setDocType] = useState<DocType | null>(null);
  const [docRecord, setDocRecord] = useState<DocRecord | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(EMPTY_INVOICE);
  const [vehicleData, setVehicleData] = useState<VehicleData>(EMPTY_VEHICLE);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [matchedVehicleId, setMatchedVehicleId] = useState<string | null>(null);
  const [matchedVehicleLabel, setMatchedVehicleLabel] = useState<string | null>(null);
  const [linkToVehicle, setLinkToVehicle] = useState(false);

  // Generate signed URL for PDF viewer
  const refreshPdfUrl = useCallback(async (filePath: string) => {
    const { data } = await supabase.storage
      .from('smart-documents')
      .createSignedUrl(filePath, 300); // 5 min TTL
    if (data?.signedUrl) setPdfUrl(data.signedUrl);
  }, []);

  // Check if detected plate matches existing vehicle
  const checkPlateMatch = useCallback(async (plate: string) => {
    if (!plate) { setMatchedVehicleId(null); setMatchedVehicleLabel(null); return; }
    const clean = plate.toUpperCase().replace(/[\s-]/g, '');
    const { data } = await supabase
      .from('vehicles')
      .select('id, plate, brand, model')
      .ilike('plate', `%${clean}%`)
      .limit(1);
    if (data && data.length > 0) {
      setMatchedVehicleId(data[0].id);
      setMatchedVehicleLabel(`${data[0].plate} - ${data[0].brand} ${data[0].model}`);
      setLinkToVehicle(true);
    } else {
      setMatchedVehicleId(null);
      setMatchedVehicleLabel(null);
      setLinkToVehicle(false);
    }
  }, []);

  // Handle type selection + file picker
  const handleSelectType = (type: DocType) => {
    setDocType(type);
    fileInputRef.current?.click();
  };

  // Handle file upload + AI extraction
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docType || !user) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Solo se admiten archivos PDF', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'El archivo no puede superar 20MB', variant: 'destructive' });
      return;
    }

    setStep('uploading');

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from('smart-documents')
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      // Create DB record
      const { data: doc, error: dbErr } = await supabase
        .from('smart_documents')
        .insert({
          document_type: docType,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
          uploaded_by_name: profile?.full_name || '',
        })
        .select()
        .single();
      if (dbErr) throw dbErr;

      setDocRecord({ id: doc.id, file_path: filePath, file_name: file.name });
      await refreshPdfUrl(filePath);

      // Call AI extraction
      const { data: aiResult, error: aiErr } = await supabase.functions.invoke('extract-pdf-data', {
        body: { file_path: filePath, document_type: docType },
      });

      if (aiErr) throw new Error(aiErr.message || 'Error en extracción IA');

      const extracted = aiResult.extracted_data || {};
      const meta = aiResult.extraction_meta || {};

      // Update DB with extracted data + meta
      await supabase
        .from('smart_documents')
        .update({ extracted_data: extracted, extraction_meta: meta })
        .eq('id', doc.id);

      // Populate form
      const filledFields = new Set<string>();
      if (docType === 'expense_invoice') {
        const d = { ...EMPTY_INVOICE };
        for (const [k, v] of Object.entries(extracted)) {
          if (v !== '' && v !== 0 && v !== null && v !== undefined) {
            (d as any)[k] = v;
            filledFields.add(k);
          }
        }
        setInvoiceData(d);
        if (d.posible_matricula_detectada) checkPlateMatch(d.posible_matricula_detectada);
      } else {
        const d = { ...EMPTY_VEHICLE };
        for (const [k, v] of Object.entries(extracted)) {
          if (v !== '' && v !== 0 && v !== null && v !== undefined) {
            (d as any)[k] = v;
            filledFields.add(k);
          }
        }
        setVehicleData(d);
      }
      setAiFields(filledFields);
      setStep('review');
    } catch (err: any) {
      console.error('Upload/extract error:', err);
      toast({ title: 'Error procesando documento', description: err.message, variant: 'destructive' });
      setStep('select');
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Cancel => clean up
  const handleCancel = async () => {
    if (docRecord) {
      await supabase.storage.from('smart-documents').remove([docRecord.file_path]);
      await supabase.from('smart_documents').delete().eq('id', docRecord.id);
    }
    resetState();
  };

  const resetState = () => {
    setStep('select');
    setDocType(null);
    setDocRecord(null);
    setPdfUrl(null);
    setInvoiceData(EMPTY_INVOICE);
    setVehicleData(EMPTY_VEHICLE);
    setAiFields(new Set());
    setMatchedVehicleId(null);
    setMatchedVehicleLabel(null);
    setLinkToVehicle(false);
    setSaving(false);
  };

  // Confirm invoice => create expense or operating expense
  const handleConfirmInvoice = async () => {
    if (!user || !docRecord) return;
    setSaving(true);
    try {
      let linkedEntityType: string;
      let linkedEntityId: string;
      let linkedVehicleId: string | null = null;

      if (linkToVehicle && matchedVehicleId) {
        // Create expense linked to vehicle
        const expense = await createExpense({
          vehicle_id: matchedVehicleId,
          date: invoiceData.fecha_factura || new Date().toISOString(),
          amount: invoiceData.total,
          base_amount: invoiceData.base_imponible,
          tax_type: invoiceData.impuesto_tipo === 'IVA' ? 'iva' : 'igic',
          tax_rate: invoiceData.impuesto_porcentaje,
          tax_amount: invoiceData.impuesto_importe,
          description: invoiceData.descripcion || 'Gasto desde factura PDF',
          supplier_name: invoiceData.proveedor_nombre,
          invoice_number: invoiceData.numero_factura,
        }, user.id);
        linkedEntityType = 'expense';
        linkedEntityId = expense.id;
        linkedVehicleId = matchedVehicleId;
      } else {
        // Create operating expense
        const { data: opExp, error: opErr } = await supabase
          .from('operating_expenses')
          .insert({
            description: `${invoiceData.proveedor_nombre} - ${invoiceData.descripcion || invoiceData.numero_factura}`,
            amount: invoiceData.total,
            category: 'otros',
            payment_method: 'transferencia',
            expense_date: invoiceData.fecha_factura || new Date().toISOString(),
            created_by: user.id,
          })
          .select()
          .single();
        if (opErr) throw opErr;
        linkedEntityType = 'operating_expense';
        linkedEntityId = opExp.id;
      }

      // Update smart_documents
      await supabase
        .from('smart_documents')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          linked_entity_type: linkedEntityType,
          linked_entity_id: linkedEntityId,
          linked_vehicle_id: linkedVehicleId,
        })
        .eq('id', docRecord.id);

      toast({ title: 'Gasto creado correctamente' });

      if (linkedVehicleId) {
        navigate(`/vehicles/${linkedVehicleId}`);
      } else {
        navigate('/operating-expenses');
      }
    } catch (err: any) {
      console.error('Confirm invoice error:', err);
      toast({ title: 'Error guardando gasto', description: err.message, variant: 'destructive' });
      setSaving(false);
    }
  };

  // Confirm vehicle technical sheet => create vehicle
  const handleConfirmVehicle = async () => {
    if (!user || !docRecord) return;
    setSaving(true);
    try {
      const engineMap: Record<string, string> = { gasolina: 'gasolina', diesel: 'diesel', hibrido: 'hibrido', electrico: 'electrico' };

      const vehicle = await createVehicle({
        plate: vehicleData.matricula,
        vin: vehicleData.vin,
        brand: vehicleData.marca,
        model: vehicleData.modelo,
        version: vehicleData.version,
        color: vehicleData.color,
        engine_type: (engineMap[vehicleData.combustible] || 'gasolina') as any,
        horsepower: vehicleData.potencia,
        displacement: vehicleData.cilindrada,
        first_registration: vehicleData.fecha_primera_matriculacion || new Date().toISOString(),
        has_technical_sheet: true,
      }, user.id);

      // Upload the PDF as vehicle document (ficha_tecnica)
      // Re-download from smart-documents bucket and upload to vehicle-documents
      const { data: signedData } = await supabase.storage
        .from('smart-documents')
        .createSignedUrl(docRecord.file_path, 60);
      if (signedData?.signedUrl) {
        const pdfResp = await fetch(signedData.signedUrl);
        const pdfBlob = await pdfResp.blob();
        const pdfFile = new File([pdfBlob], docRecord.file_name, { type: 'application/pdf' });
        await uploadDocument(pdfFile, vehicle.id, 'ficha_tecnica', user.id, profile?.full_name || '');
      }

      // Update smart_documents
      await supabase
        .from('smart_documents')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          linked_entity_type: 'vehicle',
          linked_entity_id: vehicle.id,
        })
        .eq('id', docRecord.id);

      toast({ title: 'Vehículo creado correctamente' });
      navigate(`/vehicles/${vehicle.id}`);
    } catch (err: any) {
      console.error('Confirm vehicle error:', err);
      toast({ title: 'Error creando vehículo', description: err.message, variant: 'destructive' });
      setSaving(false);
    }
  };

  // Invoice total mismatch warning
  const totalMismatch = docType === 'expense_invoice' &&
    invoiceData.base_imponible > 0 &&
    Math.abs((invoiceData.base_imponible + invoiceData.impuesto_importe) - invoiceData.total) > 0.02;

  const vinError = docType === 'vehicle_technical_sheet' ? validateVin(vehicleData.vin) : null;
  const plateError = docType === 'vehicle_technical_sheet' ? validatePlate(vehicleData.matricula) : null;

  // ─── STEP: Select type ──────────────────────────────
  if (step === 'select') {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Documentos Inteligentes</h1>
        <p className="text-muted-foreground">Sube un PDF y la IA extraerá los datos automáticamente para que los valides.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelectType('expense_invoice')}
          >
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <Receipt className="h-12 w-12 text-primary" />
              <span className="font-semibold text-lg">Factura PDF</span>
              <span className="text-sm text-muted-foreground text-center">Crear gasto desde factura de proveedor</span>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelectType('vehicle_technical_sheet')}
          >
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <Car className="h-12 w-12 text-primary" />
              <span className="font-semibold text-lg">Ficha Técnica PDF</span>
              <span className="text-sm text-muted-foreground text-center">Crear vehículo desde ficha técnica</span>
            </CardContent>
          </Card>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // ─── STEP: Uploading / processing ───────────────────
  if (step === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Analizando documento...</p>
        <p className="text-sm text-muted-foreground">La IA está extrayendo datos del PDF</p>
      </div>
    );
  }

  // ─── STEP: Review (split-screen) ────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">
            {docType === 'expense_invoice' ? 'Factura → Gasto' : 'Ficha Técnica → Vehículo'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button
            onClick={docType === 'expense_invoice' ? handleConfirmInvoice : handleConfirmVehicle}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {docType === 'expense_invoice' ? 'Confirmar y guardar gasto' : 'Crear vehículo'}
          </Button>
        </div>
      </div>

      {/* Split panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full">
            {pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Viewer" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Cargando PDF...
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {/* Warnings */}
            {totalMismatch && (
              <Alert className="border-destructive/50 bg-destructive/5 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Los totales no cuadran: base ({invoiceData.base_imponible}) + impuesto ({invoiceData.impuesto_importe}) ≠ total ({invoiceData.total})
                </AlertDescription>
              </Alert>
            )}

            {docType === 'expense_invoice' && matchedVehicleLabel && (
              <Alert className="border-primary/50 bg-primary/5">
                <Car className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Vehículo detectado: <strong>{matchedVehicleLabel}</strong></span>
                  <Button
                    variant={linkToVehicle ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLinkToVehicle(!linkToVehicle)}
                  >
                    {linkToVehicle ? 'Vinculado ✓' : 'Vincular'}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* INVOICE FORM */}
            {docType === 'expense_invoice' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <AiLabel hasAiValue={aiFields.has('proveedor_nombre')}>Proveedor</AiLabel>
                  <Input value={invoiceData.proveedor_nombre} onChange={e => setInvoiceData(d => ({ ...d, proveedor_nombre: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('proveedor_nif')}>NIF Proveedor</AiLabel>
                  <Input value={invoiceData.proveedor_nif} onChange={e => setInvoiceData(d => ({ ...d, proveedor_nif: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('numero_factura')}>Nº Factura</AiLabel>
                  <Input value={invoiceData.numero_factura} onChange={e => setInvoiceData(d => ({ ...d, numero_factura: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('fecha_factura')}>Fecha Factura</AiLabel>
                  <Input type="date" value={invoiceData.fecha_factura} onChange={e => setInvoiceData(d => ({ ...d, fecha_factura: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <AiLabel hasAiValue={aiFields.has('descripcion')}>Descripción</AiLabel>
                  <Input value={invoiceData.descripcion} onChange={e => setInvoiceData(d => ({ ...d, descripcion: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('base_imponible')}>Base Imponible</AiLabel>
                  <Input type="number" step="0.01" value={invoiceData.base_imponible} onChange={e => setInvoiceData(d => ({ ...d, base_imponible: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('impuesto_tipo')}>Tipo Impuesto</AiLabel>
                  <Select value={invoiceData.impuesto_tipo} onValueChange={v => setInvoiceData(d => ({ ...d, impuesto_tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IGIC">IGIC</SelectItem>
                      <SelectItem value="IVA">IVA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('impuesto_porcentaje')}>% Impuesto</AiLabel>
                  <Input type="number" step="0.01" value={invoiceData.impuesto_porcentaje} onChange={e => setInvoiceData(d => ({ ...d, impuesto_porcentaje: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('impuesto_importe')}>Importe Impuesto</AiLabel>
                  <Input type="number" step="0.01" value={invoiceData.impuesto_importe} onChange={e => setInvoiceData(d => ({ ...d, impuesto_importe: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('total')}>Total</AiLabel>
                  <Input type="number" step="0.01" value={invoiceData.total} onChange={e => setInvoiceData(d => ({ ...d, total: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('posible_matricula_detectada')}>Matrícula detectada</AiLabel>
                  <Input
                    value={invoiceData.posible_matricula_detectada}
                    onChange={e => {
                      const v = e.target.value;
                      setInvoiceData(d => ({ ...d, posible_matricula_detectada: v }));
                      checkPlateMatch(v);
                    }}
                  />
                </div>
              </div>
            )}

            {/* VEHICLE FORM */}
            {docType === 'vehicle_technical_sheet' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <AiLabel hasAiValue={aiFields.has('matricula')}>Matrícula</AiLabel>
                  <Input value={vehicleData.matricula} onChange={e => setVehicleData(d => ({ ...d, matricula: e.target.value }))} />
                  {plateError && <p className="text-xs text-destructive mt-1">{plateError}</p>}
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('vin')}>VIN</AiLabel>
                  <Input value={vehicleData.vin} onChange={e => setVehicleData(d => ({ ...d, vin: e.target.value }))} />
                  {vinError && <p className="text-xs text-destructive mt-1">{vinError}</p>}
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('marca')}>Marca</AiLabel>
                  <Select value={vehicleData.marca} onValueChange={v => setVehicleData(d => ({ ...d, marca: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      {vehicleData.marca && !BRANDS.includes(vehicleData.marca) && (
                        <SelectItem value={vehicleData.marca}>{vehicleData.marca}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('modelo')}>Modelo</AiLabel>
                  <Input value={vehicleData.modelo} onChange={e => setVehicleData(d => ({ ...d, modelo: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <AiLabel hasAiValue={aiFields.has('version')}>Versión</AiLabel>
                  <Input value={vehicleData.version} onChange={e => setVehicleData(d => ({ ...d, version: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('fecha_primera_matriculacion')}>1ª Matriculación</AiLabel>
                  <Input type="date" value={vehicleData.fecha_primera_matriculacion} onChange={e => setVehicleData(d => ({ ...d, fecha_primera_matriculacion: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('combustible')}>Combustible</AiLabel>
                  <Select value={vehicleData.combustible} onValueChange={v => setVehicleData(d => ({ ...d, combustible: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gasolina">Gasolina</SelectItem>
                      <SelectItem value="diesel">Diésel</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                      <SelectItem value="electrico">Eléctrico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('potencia')}>Potencia (CV)</AiLabel>
                  <Input type="number" value={vehicleData.potencia} onChange={e => setVehicleData(d => ({ ...d, potencia: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('cilindrada')}>Cilindrada (cc)</AiLabel>
                  <Input type="number" value={vehicleData.cilindrada} onChange={e => setVehicleData(d => ({ ...d, cilindrada: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('color')}>Color</AiLabel>
                  <Input value={vehicleData.color} onChange={e => setVehicleData(d => ({ ...d, color: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('numero_homologacion')}>Nº Homologación</AiLabel>
                  <Input value={vehicleData.numero_homologacion} onChange={e => setVehicleData(d => ({ ...d, numero_homologacion: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
