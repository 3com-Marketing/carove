import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BRANDS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { pdfToImages } from '@/lib/pdf-to-images';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Loader2, Sparkles, AlertTriangle, ArrowLeft, X, Upload, UserCheck, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Car } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getAcquisitionChannels } from '@/lib/supabase-api';
import type { CirculationPermitData, AcquisitionChannel } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';

type DocType = 'expense_invoice' | 'vehicle_technical_sheet' | 'insurance_policy' | 'circulation_permit';
type Step = 'upload' | 'uploading' | 'review';

export interface InvoiceData {
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

export interface VehicleData {
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

export interface InsuranceExtractedData {
  compania_aseguradora: string;
  numero_poliza: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  tipo_seguro: string;
  tomador_nombre: string;
  matricula_detectada: string;
}

export interface DocRecord {
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

const EMPTY_INSURANCE: InsuranceExtractedData = {
  compania_aseguradora: '', numero_poliza: '', fecha_inicio: '',
  fecha_vencimiento: '', tipo_seguro: 'individual', tomador_nombre: '',
  matricula_detectada: '',
};

const EMPTY_PERMIT: CirculationPermitData = {
  matricula: '', vin: '', marca: '', modelo: '',
  fecha_primera_matriculacion: '', tipo_legal: 'turismo', potencia: 0,
  cilindrada: 0, nombre_completo: '', dni_cif: '', direccion: '',
};

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

function isCif(doc: string): boolean {
  if (!doc) return false;
  const clean = doc.toUpperCase().trim();
  return /^[ABCDEFGHJNPQRSUVW]\d{7}[A-Z0-9]$/.test(clean);
}

function AiLabel({ children, hasAiValue }: { children: React.ReactNode; hasAiValue: boolean }) {
  return (
    <Label className="flex items-center gap-1.5">
      {children}
      {hasAiValue && <Sparkles className="h-3 w-3 text-primary" />}
    </Label>
  );
}

interface SmartDocumentFlowProps {
  documentType: DocType;
  vehicleId?: string;
  onConfirmInvoice?: (data: InvoiceData, docRecord: DocRecord, matchedVehicleId: string | null, linkToVehicle: boolean) => Promise<void>;
  onConfirmVehicle?: (data: VehicleData, docRecord: DocRecord) => Promise<void>;
  onConfirmInsurance?: (data: InsuranceExtractedData, docRecord: DocRecord) => Promise<void>;
  onConfirmCirculationPermit?: (data: CirculationPermitData, docRecord: DocRecord, extra: {
    existingClientId: string | null;
    useExistingClient: boolean;
    acquisitionChannelId: string;
    clientType: 'particular' | 'profesional';
    bodyType: string;
    segmentId: string;
    version: string;
  }) => Promise<void>;
  onCancel: () => void;
  hideVehicleMatch?: boolean;
}

export default function SmartDocumentFlow({
  documentType,
  vehicleId,
  onConfirmInvoice,
  onConfirmVehicle,
  onConfirmInsurance,
  onConfirmCirculationPermit,
  onCancel,
  hideVehicleMatch = false,
}: SmartDocumentFlowProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [docRecord, setDocRecord] = useState<DocRecord | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [allPageUrls, setAllPageUrls] = useState<string[]>([]);
  const [fileIsImage, setFileIsImage] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(EMPTY_INVOICE);
  const [vehicleData, setVehicleData] = useState<VehicleData>(EMPTY_VEHICLE);
  const [insuranceData, setInsuranceData] = useState<InsuranceExtractedData>(EMPTY_INSURANCE);
  const [permitData, setPermitData] = useState<CirculationPermitData>(EMPTY_PERMIT);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [matchedVehicleId, setMatchedVehicleId] = useState<string | null>(vehicleId || null);
  const [matchedVehicleLabel, setMatchedVehicleLabel] = useState<string | null>(null);
  const [linkToVehicle, setLinkToVehicle] = useState(!!vehicleId);

  // Circulation permit extra state
  const [existingClientId, setExistingClientId] = useState<string | null>(null);
  const [existingClientLabel, setExistingClientLabel] = useState<string | null>(null);
  const [useExistingClient, setUseExistingClient] = useState(false);
  const [duplicateVehicle, setDuplicateVehicle] = useState<{ id: string; label: string } | null>(null);
  const [channelId, setChannelId] = useState('');
  const [permitBodyType, setPermitBodyType] = useState('');
  const [permitSegmentId, setPermitSegmentId] = useState('');
  const [permitVersion, setPermitVersion] = useState('');
  const [detectedClientType, setDetectedClientType] = useState<'particular' | 'profesional'>('particular');

  const { data: channels = [] } = useQuery({
    queryKey: ['acquisition-channels'],
    queryFn: getAcquisitionChannels,
    enabled: documentType === 'circulation_permit',
  });

  // Segments for permit flow
  const { data: segments = [] } = useQuery({
    queryKey: ['segments-permit'],
    queryFn: async () => {
      const { data } = await supabase.from('vehicle_segments').select('*').eq('active', true).order('code');
      return data || [];
    },
    enabled: documentType === 'circulation_permit',
  });

  const BODY_TYPE_OPTIONS = [
    { value: 'sedan', label: 'Sedán' }, { value: 'hatchback', label: 'Hatchback' },
    { value: 'suv', label: 'SUV' }, { value: 'coupe', label: 'Coupé' },
    { value: 'cabrio', label: 'Cabrio' }, { value: 'monovolumen', label: 'Monovolumen' },
    { value: 'pick_up', label: 'Pick-up' }, { value: 'furgoneta', label: 'Furgoneta' },
    { value: 'otro', label: 'Otro' },
  ];

  const refreshPdfUrl = useCallback(async (filePath: string) => {
    const { data } = await supabase.storage
      .from('smart-documents')
      .createSignedUrl(filePath, 300);
    if (data?.signedUrl) setPdfUrl(data.signedUrl);
  }, []);

  const checkPlateMatch = useCallback(async (plate: string) => {
    if (hideVehicleMatch || vehicleId) return;
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
  }, [hideVehicleMatch, vehicleId]);

  // Check for duplicate vehicle and existing client for circulation_permit
  const checkPermitDuplicates = useCallback(async (data: CirculationPermitData) => {
    // Check vehicle by plate
    const plateClean = data.matricula?.toUpperCase().replace(/[\s-]/g, '');
    if (plateClean) {
      const { data: vByPlate } = await supabase.from('vehicles').select('id, plate, brand, model').ilike('plate', `%${plateClean}%`).limit(1);
      if (vByPlate && vByPlate.length > 0) {
        setDuplicateVehicle({ id: vByPlate[0].id, label: `${vByPlate[0].plate} - ${vByPlate[0].brand} ${vByPlate[0].model}` });
        return;
      }
    }
    // Check vehicle by VIN
    const vinClean = data.vin?.toUpperCase().replace(/\s/g, '');
    if (vinClean && vinClean.length === 17) {
      const { data: vByVin } = await supabase.from('vehicles').select('id, plate, brand, model').ilike('vin', `%${vinClean}%`).limit(1);
      if (vByVin && vByVin.length > 0) {
        setDuplicateVehicle({ id: vByVin[0].id, label: `${vByVin[0].plate} - ${vByVin[0].brand} ${vByVin[0].model}` });
        return;
      }
    }
    setDuplicateVehicle(null);

    // Check client by DNI/CIF
    if (data.dni_cif) {
      const docClean = data.dni_cif.toUpperCase().trim();
      const isProf = isCif(docClean);
      setDetectedClientType(isProf ? 'profesional' : 'particular');
      
      const { data: clients } = await supabase.from('buyers')
        .select('id, name, last_name, company_name, dni, cif, client_type')
        .or(`dni.ilike.%${docClean}%,cif.ilike.%${docClean}%`)
        .limit(1);
      if (clients && clients.length > 0) {
        const c = clients[0];
        const label = c.client_type === 'profesional' ? (c.company_name || c.name) : `${c.name} ${c.last_name || ''}`.trim();
        setExistingClientId(c.id);
        setExistingClientLabel(label);
        setUseExistingClient(true);
      } else {
        setExistingClientId(null);
        setExistingClientLabel(null);
        setUseExistingClient(false);
      }
    }
  }, []);

  const acceptedTypes = 'application/pdf,image/jpeg,image/png';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Solo se admiten PDF, JPG o PNG', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'El archivo no puede superar 20MB', variant: 'destructive' });
      return;
    }

    const isPdf = file.type === 'application/pdf';
    setStep('uploading');

    try {
      // If PDF, convert ALL pages to images in the browser to avoid edge function memory limits
      let filesToUpload: File[];
      if (isPdf) {
        toast({ title: 'Convirtiendo PDF a imágenes...', description: 'Esto puede tardar unos segundos' });
        const images = await pdfToImages(file, { scale: 2.0, quality: 0.85, maxPages: 10 });
        if (images.length === 0) throw new Error('No se pudo convertir el PDF');
        filesToUpload = images;
      } else {
        filesToUpload = [file];
      }

      setFileIsImage(true); // After conversion, we always upload images

      // Upload ALL page images
      const timestamp = Date.now();
      const uploadedPaths: string[] = [];
      for (const pageFile of filesToUpload) {
        const safeName = pageFile.name
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_.\-]/g, '');
        const pagePath = `${user.id}/${timestamp}_${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from('smart-documents')
          .upload(pagePath, pageFile);
        if (uploadErr) throw uploadErr;
        uploadedPaths.push(pagePath);
      }

      const filePath = uploadedPaths[0]; // Primary path for db record

      const { data: doc, error: dbErr } = await supabase
        .from('smart_documents')
        .insert({
          document_type: documentType,
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

      // Generate signed URLs for ALL pages for preview
      const pageUrls: string[] = [];
      for (const p of uploadedPaths) {
        const { data } = await supabase.storage
          .from('smart-documents')
          .createSignedUrl(p, 300);
        if (data?.signedUrl) pageUrls.push(data.signedUrl);
      }
      setAllPageUrls(pageUrls);
      if (pageUrls.length > 0) setPdfUrl(pageUrls[0]);

      // Send ALL paths to edge function for multi-page AI analysis
      const { data: aiResult, error: aiErr } = await supabase.functions.invoke('extract-pdf-data', {
        body: { file_paths: uploadedPaths, document_type: documentType },
      });

      if (aiErr) throw new Error(aiErr.message || 'Error en extracción IA');

      const extracted = aiResult.extracted_data || {};
      const meta = aiResult.extraction_meta || {};

      await supabase
        .from('smart_documents')
        .update({ extracted_data: extracted, extraction_meta: meta })
        .eq('id', doc.id);

      const filledFields = new Set<string>();

      if (documentType === 'circulation_permit') {
        const d = { ...EMPTY_PERMIT };
        for (const [k, v] of Object.entries(extracted)) {
          if (v !== '' && v !== 0 && v !== null && v !== undefined) {
            (d as any)[k] = v;
            filledFields.add(k);
          }
        }
        setPermitData(d);
        await checkPermitDuplicates(d);
      } else if (documentType === 'expense_invoice') {
        const d = { ...EMPTY_INVOICE };
        for (const [k, v] of Object.entries(extracted)) {
          if (v !== '' && v !== 0 && v !== null && v !== undefined) {
            (d as any)[k] = v;
            filledFields.add(k);
          }
        }
        setInvoiceData(d);
        if (d.posible_matricula_detectada) checkPlateMatch(d.posible_matricula_detectada);
      } else if (documentType === 'insurance_policy') {
        const d = { ...EMPTY_INSURANCE };
        for (const [k, v] of Object.entries(extracted)) {
          if (v !== '' && v !== 0 && v !== null && v !== undefined) {
            (d as any)[k] = v;
            filledFields.add(k);
          }
        }
        setInsuranceData(d);
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
      setStep('upload');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = async () => {
    if (docRecord) {
      await supabase.storage.from('smart-documents').remove([docRecord.file_path]);
      await supabase.from('smart_documents').delete().eq('id', docRecord.id);
    }
    onCancel();
  };

  const handleConfirm = async () => {
    if (!docRecord) return;
    setSaving(true);
    try {
      if (documentType === 'circulation_permit' && onConfirmCirculationPermit) {
        if (!channelId) {
          toast({ title: 'Canal de captación obligatorio', description: 'Selecciona un canal de captación para el cliente.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (!permitBodyType) {
          toast({ title: 'Carrocería obligatoria', description: 'Selecciona el tipo de carrocería del vehículo.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (!permitSegmentId) {
          toast({ title: 'Segmento obligatorio', description: 'Selecciona el segmento del vehículo.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        if (duplicateVehicle) {
          toast({ title: 'Vehículo duplicado', description: 'No se puede crear un vehículo que ya existe.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        await onConfirmCirculationPermit(permitData, docRecord, {
          existingClientId: useExistingClient ? existingClientId : null,
          useExistingClient,
          acquisitionChannelId: channelId,
          clientType: detectedClientType,
          bodyType: permitBodyType,
          segmentId: permitSegmentId,
          version: permitVersion,
        });
      } else if (documentType === 'expense_invoice' && onConfirmInvoice) {
        await onConfirmInvoice(invoiceData, docRecord, matchedVehicleId, linkToVehicle);
      } else if (documentType === 'vehicle_technical_sheet' && onConfirmVehicle) {
        await onConfirmVehicle(vehicleData, docRecord);
      } else if (documentType === 'insurance_policy' && onConfirmInsurance) {
        await onConfirmInsurance(insuranceData, docRecord);
      }
    } catch (err: any) {
      console.error('Confirm error:', err);
      toast({ title: 'Error guardando', description: err.message, variant: 'destructive' });
      setSaving(false);
    }
  };

  // Upload step
  if (step === 'upload') {
    const uploadLabel = documentType === 'circulation_permit' ? 'Subir Permiso de Circulación' :
      documentType === 'expense_invoice' ? 'Subir PDF' :
      documentType === 'insurance_policy' ? 'Subir PDF' : 'Subir PDF';
    const uploadDesc = documentType === 'circulation_permit'
      ? 'Sube un PDF o imagen (JPG/PNG) del permiso de circulación'
      : documentType === 'expense_invoice'
      ? 'Sube una factura PDF y la IA extraerá los datos'
      : documentType === 'insurance_policy'
      ? 'Sube una póliza de seguro PDF y la IA extraerá los datos'
      : 'Sube una ficha técnica PDF y la IA extraerá los datos';

    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors max-w-sm w-full" onClick={() => fileInputRef.current?.click()}>
          <CardContent className="flex flex-col items-center gap-3 p-8">
            <Upload className="h-12 w-12 text-primary" />
            <span className="font-semibold text-lg">{uploadLabel}</span>
            <span className="text-sm text-muted-foreground text-center">{uploadDesc}</span>
          </CardContent>
        </Card>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    );
  }

  // Uploading step
  if (step === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Analizando documento...</p>
        <p className="text-sm text-muted-foreground">La IA está extrayendo datos del documento</p>
      </div>
    );
  }

  // Review step (split screen)
  const totalMismatch = documentType === 'expense_invoice' &&
    invoiceData.base_imponible > 0 &&
    Math.abs((invoiceData.base_imponible + invoiceData.impuesto_importe) - invoiceData.total) > 0.02;

  const vinError = (documentType === 'vehicle_technical_sheet' || documentType === 'circulation_permit')
    ? validateVin(documentType === 'circulation_permit' ? permitData.vin : vehicleData.vin) : null;
  const plateError = (documentType === 'vehicle_technical_sheet' || documentType === 'circulation_permit')
    ? validatePlate(documentType === 'circulation_permit' ? permitData.matricula : vehicleData.matricula) : null;

  const confirmLabel = documentType === 'expense_invoice' ? 'Confirmar y guardar gasto'
    : documentType === 'insurance_policy' ? 'Confirmar seguro'
    : documentType === 'circulation_permit' ? 'Crear cliente y vehículo'
    : 'Crear vehículo';

  const headerLabel = documentType === 'expense_invoice' ? 'Factura → Gasto'
    : documentType === 'insurance_policy' ? 'Póliza → Seguro'
    : documentType === 'circulation_permit' ? 'Permiso → Cliente + Vehículo'
    : 'Ficha Técnica → Vehículo';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">{headerLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !!duplicateVehicle}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>

      {/* Split panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full overflow-y-auto">
            {allPageUrls.length > 0 ? (
              <div className="flex flex-col gap-2 p-2">
                {allPageUrls.map((url, i) => (
                  <div key={i} className="relative">
                    <div className="absolute top-2 left-2 bg-background/80 text-xs px-2 py-0.5 rounded font-medium">
                      Página {i + 1} de {allPageUrls.length}
                    </div>
                    <img src={url} className="w-full object-contain border rounded" alt={`Página ${i + 1}`} />
                  </div>
                ))}
              </div>
            ) : pdfUrl ? (
              fileIsImage ? (
                <img src={pdfUrl} className="w-full h-full object-contain" alt="Documento" />
              ) : (
                <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Viewer" />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Cargando documento...
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

            {documentType === 'expense_invoice' && !hideVehicleMatch && matchedVehicleLabel && (
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

            {/* CIRCULATION PERMIT FORM */}
            {documentType === 'circulation_permit' && (
              <div className="space-y-6">
                {/* Duplicate vehicle alert */}
                {duplicateVehicle && (
                  <Alert className="border-destructive/50 bg-destructive/5 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Este vehículo ya existe: <strong>{duplicateVehicle.label}</strong></span>
                      <Button size="sm" variant="outline" onClick={() => window.open(`/vehicles/${duplicateVehicle.id}`, '_blank')}>
                        Ver ficha
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* CLIENT BLOCK */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-base">Datos del Titular (Cliente)</h3>
                    <Badge variant="outline" className="ml-auto">{detectedClientType === 'profesional' ? 'Profesional' : 'Particular'}</Badge>
                  </div>

                  {existingClientLabel && (
                    <Alert className="border-primary/50 bg-primary/5">
                      <UserCheck className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>Cliente encontrado: <strong>{existingClientLabel}</strong></span>
                        <div className="flex gap-1">
                          <Button size="sm" variant={useExistingClient ? 'default' : 'outline'} onClick={() => setUseExistingClient(true)}>
                            Vincular existente
                          </Button>
                          <Button size="sm" variant={!useExistingClient ? 'default' : 'outline'} onClick={() => setUseExistingClient(false)}>
                            Crear nuevo
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <AiLabel hasAiValue={aiFields.has('nombre_completo')}>
                        {detectedClientType === 'profesional' ? 'Razón Social' : 'Nombre completo'}
                      </AiLabel>
                      <Input value={permitData.nombre_completo} onChange={e => setPermitData(d => ({ ...d, nombre_completo: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="font-medium">Origen del vehículo</Label>
                      <Select value={detectedClientType} onValueChange={(v: 'particular' | 'profesional') => setDetectedClientType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="particular">Particular</SelectItem>
                          <SelectItem value="profesional">Empresa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Rol</Label>
                      <Input value="Vendedor" disabled className="bg-muted" />
                    </div>
                    <div className="col-span-2">
                      <AiLabel hasAiValue={aiFields.has('direccion')}>Dirección</AiLabel>
                      <Input value={permitData.direccion} onChange={e => setPermitData(d => ({ ...d, direccion: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-destructive font-medium">Canal de captación *</Label>
                      <Select value={channelId} onValueChange={setChannelId}>
                        <SelectTrigger className={!channelId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Seleccionar canal..." />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.filter(c => c.active).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* VEHICLE BLOCK */}
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-base">Datos del Vehículo</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <AiLabel hasAiValue={aiFields.has('matricula')}>Matrícula</AiLabel>
                      <Input value={permitData.matricula} onChange={e => setPermitData(d => ({ ...d, matricula: e.target.value }))} />
                      {plateError && <p className="text-xs text-destructive mt-1">{plateError}</p>}
                    </div>
                    <div>
                      <AiLabel hasAiValue={aiFields.has('vin')}>VIN</AiLabel>
                      <Input value={permitData.vin} onChange={e => setPermitData(d => ({ ...d, vin: e.target.value }))} />
                      {vinError && <p className="text-xs text-destructive mt-1">{vinError}</p>}
                    </div>
                    <div>
                      <AiLabel hasAiValue={aiFields.has('marca')}>Marca</AiLabel>
                      <Select value={permitData.marca} onValueChange={v => setPermitData(d => ({ ...d, marca: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          {permitData.marca && !BRANDS.includes(permitData.marca) && (
                            <SelectItem value={permitData.marca}>{permitData.marca}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <AiLabel hasAiValue={aiFields.has('modelo')}>Modelo</AiLabel>
                      <Input value={permitData.modelo} onChange={e => setPermitData(d => ({ ...d, modelo: e.target.value }))} />
                    </div>
                    <div>
                      <AiLabel hasAiValue={aiFields.has('tipo_legal')}>Tipo legal</AiLabel>
                      <Select value={permitData.tipo_legal} onValueChange={v => setPermitData(d => ({ ...d, tipo_legal: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="turismo">Turismo</SelectItem>
                          <SelectItem value="mixto">Mixto</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <AiLabel hasAiValue={aiFields.has('fecha_primera_matriculacion')}>1ª Matriculación</AiLabel>
                      <Input type="date" value={permitData.fecha_primera_matriculacion} onChange={e => setPermitData(d => ({ ...d, fecha_primera_matriculacion: e.target.value }))} />
                    </div>
                    <div>
                      <AiLabel hasAiValue={aiFields.has('potencia')}>Potencia (CV)</AiLabel>
                      <Input type="number" value={permitData.potencia} onChange={e => setPermitData(d => ({ ...d, potencia: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <AiLabel hasAiValue={aiFields.has('cilindrada')}>Cilindrada (cc)</AiLabel>
                      <Input type="number" value={permitData.cilindrada} onChange={e => setPermitData(d => ({ ...d, cilindrada: parseInt(e.target.value) || 0 }))} />
                    </div>

                    {/* User must complete these */}
                    <div>
                      <Label className="text-destructive font-medium">Carrocería *</Label>
                      <Select value={permitBodyType} onValueChange={setPermitBodyType}>
                        <SelectTrigger className={!permitBodyType ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BODY_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-destructive font-medium">Segmento *</Label>
                      <Select value={permitSegmentId} onValueChange={setPermitSegmentId}>
                        <SelectTrigger className={!permitSegmentId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {segments.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Versión (opcional)</Label>
                      <Input value={permitVersion} onChange={e => setPermitVersion(e.target.value)} placeholder="Ej: Sport, Advance..." />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INVOICE FORM */}
            {documentType === 'expense_invoice' && (
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
                {!hideVehicleMatch && (
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
                )}
              </div>
            )}

            {/* VEHICLE FORM */}
            {documentType === 'vehicle_technical_sheet' && (
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

            {/* INSURANCE FORM */}
            {documentType === 'insurance_policy' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <AiLabel hasAiValue={aiFields.has('compania_aseguradora')}>Compañía aseguradora</AiLabel>
                  <Input value={insuranceData.compania_aseguradora} onChange={e => setInsuranceData(d => ({ ...d, compania_aseguradora: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('numero_poliza')}>Nº Póliza</AiLabel>
                  <Input value={insuranceData.numero_poliza} onChange={e => setInsuranceData(d => ({ ...d, numero_poliza: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('tipo_seguro')}>Tipo de seguro</AiLabel>
                  <Select value={insuranceData.tipo_seguro} onValueChange={v => setInsuranceData(d => ({ ...d, tipo_seguro: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="flota">Flota</SelectItem>
                      <SelectItem value="provisional">Provisional</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('fecha_inicio')}>Fecha inicio</AiLabel>
                  <Input type="date" value={insuranceData.fecha_inicio} onChange={e => setInsuranceData(d => ({ ...d, fecha_inicio: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('fecha_vencimiento')}>Fecha vencimiento</AiLabel>
                  <Input type="date" value={insuranceData.fecha_vencimiento} onChange={e => setInsuranceData(d => ({ ...d, fecha_vencimiento: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('tomador_nombre')}>Tomador</AiLabel>
                  <Input value={insuranceData.tomador_nombre} onChange={e => setInsuranceData(d => ({ ...d, tomador_nombre: e.target.value }))} />
                </div>
                <div>
                  <AiLabel hasAiValue={aiFields.has('matricula_detectada')}>Matrícula detectada</AiLabel>
                  <Input value={insuranceData.matricula_detectada} onChange={e => setInsuranceData(d => ({ ...d, matricula_detectada: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
