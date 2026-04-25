import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createVehicle, createExpense, createNote, uploadDocument, createBuyer } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { useBranches } from '@/hooks/useBranches';
import type { VehicleClass, VehicleType, EngineType, Transmission, TaxType, CirculationPermitData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Sparkles, Loader2, FileSearch, PlusCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SmartDocumentFlow from '@/components/smart-documents/SmartDocumentFlow';
import type { VehicleData, DocRecord } from '@/components/smart-documents/SmartDocumentFlow';
import MasterVehicleSelector from '@/components/vehicles/MasterVehicleSelector';
import type { MasterVehicleValues } from '@/components/vehicles/MasterVehicleSelector';

type Mode = 'select' | 'manual' | 'ai' | 'permit';

export default function VehicleNew() {
  const navigate = useNavigate();
  const { data: branches = [] } = useBranches();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('select');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiExtras, setAiExtras] = useState<{ expenses: any[]; notes: any[] } | null>(null);

  // Master data fields
  const [masterValues, setMasterValues] = useState<MasterVehicleValues>({
    master_brand_id: '', master_model_id: '', master_version_id: '',
    body_type: '', segment_id: '', brand: '', model: '', version: '',
  });

  const [form, setForm] = useState({
    plate: '', vin: '', color: '',
    vehicle_class: 'turismo' as VehicleClass,
    vehicle_type: 'ocasion' as VehicleType,
    engine_type: 'gasolina' as EngineType,
    transmission: 'manual' as Transmission,
    displacement: '', horsepower: '', km_entry: '',
    first_registration: '', itv_date: '', purchase_date: '', expo_date: '',
    purchase_price: '', pvp_base: '', price_professionals: '', price_financed: '', price_cash: '',
    tax_type: 'igic' as TaxType, tax_rate: '7', irpf_rate: '0', discount: '0',
    center: 'Las Palmas',
    has_second_key: false, has_technical_sheet: false, has_circulation_permit: false, has_manual: false,
  });

  const set = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const handleMasterChange = (partial: Partial<MasterVehicleValues>) => {
    setMasterValues(prev => ({ ...prev, ...partial }));
  };

  const handleGenerate = async () => {
    // ─────────────────────────────────────────────────────────────────────
    // DESACTIVADO: Edge Function `generate-vehicle` no desplegada.
    // Cuando esté disponible, restaurar el bloque comentado abajo.
    // ─────────────────────────────────────────────────────────────────────
    toast({
      title: 'Generación con IA no disponible',
      description: 'La Edge Function `generate-vehicle` aún no está desplegada. Rellena el formulario manualmente.',
      variant: 'destructive',
    });
    return;

    /* eslint-disable */
    // @ts-ignore — código original preservado para reactivación
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vehicle');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const v = data.vehicle;
      setForm(prev => ({
        ...prev,
        plate: v.plate || '', vin: v.vin || '', color: v.color || '',
        vehicle_class: v.vehicle_class || 'turismo', vehicle_type: v.vehicle_type || 'ocasion',
        engine_type: v.engine_type || 'gasolina', transmission: v.transmission || 'manual',
        displacement: String(v.displacement || ''), horsepower: String(v.horsepower || ''),
        km_entry: String(v.km_entry || ''), first_registration: v.first_registration || '',
        itv_date: v.itv_date || '', purchase_date: v.purchase_date || '', expo_date: v.expo_date || '',
        purchase_price: String(v.purchase_price || ''), pvp_base: String(v.pvp_base || ''),
        price_professionals: String(v.price_professionals || ''), price_financed: String(v.price_financed || ''),
        price_cash: String(v.price_cash || ''), tax_type: v.tax_type || 'igic',
        tax_rate: String(v.tax_rate ?? '7'), irpf_rate: '0', discount: '0',
        center: v.center || 'Las Palmas',
        has_second_key: v.has_second_key ?? false, has_technical_sheet: v.has_technical_sheet ?? false,
        has_circulation_permit: v.has_circulation_permit ?? false, has_manual: v.has_manual ?? false,
      }));
      setAiExtras({ expenses: data.expenses || [], notes: data.notes || [] });
      toast({ title: '✨ Datos generados con IA', description: `Revisa y asigna marca/modelo desde los maestros.` });
    } catch (e: any) {
      toast({ title: '❌ Error al generar', description: e.message || 'No se pudieron generar los datos.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
    /* eslint-enable */
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plate) {
      toast({ title: 'Campo obligatorio', description: 'La matrícula es obligatoria.', variant: 'destructive' }); return;
    }
    if (!masterValues.master_brand_id) {
      toast({ title: 'Campo obligatorio', description: 'Selecciona una marca desde los datos maestros.', variant: 'destructive' }); return;
    }
    if (!masterValues.master_model_id) {
      toast({ title: 'Campo obligatorio', description: 'Selecciona un modelo desde los datos maestros.', variant: 'destructive' }); return;
    }
    if (!masterValues.body_type) {
      toast({ title: 'Campo obligatorio', description: 'La carrocería es obligatoria (viene del modelo).', variant: 'destructive' }); return;
    }
    if (!masterValues.segment_id) {
      toast({ title: 'Campo obligatorio', description: 'El segmento es obligatorio (viene del modelo).', variant: 'destructive' }); return;
    }
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión.', variant: 'destructive' }); return;
    }

    const { data: existingPlate } = await supabase.from('vehicles').select('id').eq('plate', form.plate).limit(1);
    if (existingPlate && existingPlate.length > 0) {
      toast({ title: '❌ Matrícula duplicada', description: `Ya existe un vehículo con la matrícula ${form.plate}.`, variant: 'destructive' }); return;
    }
    if (form.vin) {
      const { data: existingVin } = await supabase.from('vehicles').select('id').eq('vin', form.vin).limit(1);
      if (existingVin && existingVin.length > 0) {
        toast({ title: '❌ VIN duplicado', description: `Ya existe un vehículo con el VIN ${form.vin}.`, variant: 'destructive' }); return;
      }
    }

    setSaving(true);
    try {
      const pp = Number(form.purchase_price) || 0;
      const pvp = Number(form.pvp_base) || 0;
      const expTotal = aiExtras?.expenses?.reduce((sum, ex) => sum + (ex.amount || 0), 0) || 0;

      const vehicle = await createVehicle({
        ...form,
        brand: masterValues.brand,
        model: masterValues.model,
        version: masterValues.version,
        master_brand_id: masterValues.master_brand_id,
        master_model_id: masterValues.master_model_id,
        master_version_id: masterValues.master_version_id || null,
        segment_id: masterValues.segment_id,
        body_type: masterValues.body_type,
        segment_auto_assigned: true,
        displacement: Number(form.displacement) || 0,
        horsepower: Number(form.horsepower) || 0,
        km_entry: Number(form.km_entry) || 0,
        purchase_price: pp,
        pvp_base: pvp,
        price_professionals: Number(form.price_professionals) || 0,
        price_financed: Number(form.price_financed) || 0,
        price_cash: Number(form.price_cash) || 0,
        tax_rate: Number(form.tax_rate) || 7,
        irpf_rate: Number(form.irpf_rate) || 0,
        discount: Number(form.discount) || 0,
        total_expenses: expTotal,
        total_cost: pp + expTotal,
        net_profit: pvp - pp - expTotal,
        first_registration: form.first_registration || new Date().toISOString(),
        purchase_date: form.purchase_date || new Date().toISOString(),
        expo_date: form.expo_date || new Date().toISOString(),
        itv_date: form.itv_date || null,
      } as any, user.id);

      if (aiExtras) {
        for (const ex of aiExtras.expenses) {
          await createExpense({ vehicle_id: vehicle.id, date: ex.date, completion_date: ex.completion_date || null, supplier_name: ex.supplier_name, invoice_number: ex.invoice_number, amount: ex.amount, description: ex.description, observations: ex.observations }, user.id);
        }
        for (const note of aiExtras.notes) {
          await createNote({ vehicle_id: vehicle.id, content: note.content, author_name: note.author_name }, user.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      // Find the auto-created purchase
      const { data: linkedPurchase } = await supabase
        .from('vehicle_purchases')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      toast({
        title: '✅ Vehículo creado',
        description: `${vehicle.brand} ${vehicle.model} (${vehicle.plate}) — Marcado como No disponible. Se ha iniciado su proceso de compra.`,
        duration: 8000,
      });

      // Navigate to purchase if available, otherwise to vehicle
      if (linkedPurchase?.id) {
        toast({
          title: '📋 Ir al proceso de compra',
          description: 'Pulsa para abrir la operación de compra vinculada.',
          action: (
            <Button variant="outline" size="sm" onClick={() => navigate(`/purchases/${linkedPurchase.id}`)}>
              Ir a compra
            </Button>
          ),
          duration: 10000,
        });
        navigate(`/vehicles/${vehicle.id}`);
      } else {
        navigate(`/vehicles/${vehicle.id}`);
      }
    } catch (err: any) {
      toast({ title: '❌ Error al guardar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Handle AI vehicle creation from technical sheet
  const handleConfirmVehicle = async (vehicleDataAi: VehicleData, docRecord: DocRecord) => {
    if (!user) return;
    const engineMap: Record<string, string> = { gasolina: 'gasolina', diesel: 'diesel', hibrido: 'hibrido', electrico: 'electrico' };

    const { data: existingBrands } = await supabase.from('master_brands').select('*').ilike('normalized_name', vehicleDataAi.marca.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    let brandId: string;
    let brandName: string;
    if (existingBrands && existingBrands.length > 0) {
      brandId = existingBrands[0].id;
      brandName = existingBrands[0].name;
    } else {
      const newBrand = await (await import('@/lib/supabase-api')).createMasterBrand(vehicleDataAi.marca, user.id);
      brandId = newBrand.id;
      brandName = newBrand.name;
    }

    const { data: existingModels } = await supabase.from('master_models').select('*').eq('brand_id', brandId).ilike('normalized_name', vehicleDataAi.modelo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    let modelId: string;
    let modelName: string;
    let segmentId: string | null = null;
    let bodyType: string | null = null;
    if (existingModels && existingModels.length > 0) {
      modelId = existingModels[0].id;
      modelName = existingModels[0].name;
      segmentId = existingModels[0].segment_id;
      bodyType = existingModels[0].body_type;
    } else {
      const { data: segs } = await supabase.from('vehicle_segments').select('id').limit(1);
      const defaultSegmentId = segs?.[0]?.id || '';
      const newModel = await (await import('@/lib/supabase-api')).createMasterModel({
        brand_id: brandId, name: vehicleDataAi.modelo, body_type: 'otro', segment_id: defaultSegmentId,
      }, user.id);
      modelId = newModel.id;
      modelName = newModel.name;
      segmentId = newModel.segment_id;
      bodyType = newModel.body_type;
    }

    let versionId: string | null = null;
    let versionName = vehicleDataAi.version || '';
    if (versionName) {
      const normVer = versionName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const { data: existingVersions } = await supabase.from('master_versions').select('*').eq('master_model_id', modelId).ilike('normalized_name', normVer);
      if (existingVersions && existingVersions.length > 0) {
        versionId = existingVersions[0].id;
        versionName = existingVersions[0].name;
      } else {
        const newVer = await (await import('@/lib/supabase-api')).createMasterVersion({ master_model_id: modelId, name: versionName }, user.id);
        versionId = newVer.id;
        versionName = newVer.name;
      }
    }

    const vehicle = await createVehicle({
      plate: vehicleDataAi.matricula,
      vin: vehicleDataAi.vin,
      brand: brandName,
      model: modelName,
      version: versionName,
      color: vehicleDataAi.color,
      engine_type: (engineMap[vehicleDataAi.combustible] || 'gasolina') as any,
      horsepower: vehicleDataAi.potencia,
      displacement: vehicleDataAi.cilindrada,
      first_registration: vehicleDataAi.fecha_primera_matriculacion || new Date().toISOString(),
      has_technical_sheet: true,
      master_brand_id: brandId,
      master_model_id: modelId,
      master_version_id: versionId,
      segment_id: segmentId,
      body_type: bodyType,
      segment_auto_assigned: true,
      needs_review: true,
    }, user.id);

    try {
      const { data: signedData } = await supabase.storage.from('smart-documents').createSignedUrl(docRecord.file_path, 120);
      if (signedData?.signedUrl) {
        const pdfResp = await fetch(signedData.signedUrl);
        if (!pdfResp.ok) throw new Error(`HTTP ${pdfResp.status}`);
        const pdfBlob = await pdfResp.blob();
        const pdfFile = new File([pdfBlob], docRecord.file_name, { type: 'application/pdf' });
        await uploadDocument(pdfFile, vehicle.id, 'ficha_tecnica', user.id, profile?.full_name || '');
      }
    } catch (docErr: any) {
      console.error('Error copying PDF to vehicle documents:', docErr);
    }

    await supabase.from('smart_documents').update({
      status: 'confirmed', confirmed_at: new Date().toISOString(),
      linked_entity_type: 'vehicle', linked_entity_id: vehicle.id, linked_vehicle_id: vehicle.id,
    }).eq('id', docRecord.id);

    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    toast({ title: '✅ Vehículo creado desde ficha técnica', description: 'Marcado como No disponible. Se ha iniciado su proceso de compra.' });
    
    const { data: linkedPurchase } = await supabase
      .from('vehicle_purchases')
      .select('id')
      .eq('vehicle_id', vehicle.id)
      .limit(1)
      .maybeSingle();

    if (linkedPurchase?.id) {
      toast({
        title: '📋 Ir al proceso de compra',
        description: 'Pulsa para abrir la operación de compra vinculada.',
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate(`/purchases/${linkedPurchase.id}`)}>
            Ir a compra
          </Button>
        ),
        duration: 10000,
      });
      navigate(`/vehicles/${vehicle.id}`);
    } else {
      navigate(`/vehicles/${vehicle.id}`);
    }
  };

  // Handle circulation permit creation
  const handleConfirmCirculationPermit = async (
    permitDataAi: CirculationPermitData,
    docRecord: DocRecord,
    extra: {
      existingClientId: string | null;
      useExistingClient: boolean;
      acquisitionChannelId: string;
      clientType: 'particular' | 'profesional';
      bodyType: string;
      segmentId: string;
      version: string;
    }
  ) => {
    if (!user) return;

    // 1. Create or link client
    let clientId: string;
    if (extra.useExistingClient && extra.existingClientId) {
      clientId = extra.existingClientId;
    } else {
      const isProf = extra.clientType === 'profesional';
      const newClient = await createBuyer({
        name: isProf ? '' : permitDataAi.nombre_completo.split(' ')[0] || permitDataAi.nombre_completo,
        last_name: isProf ? null : permitDataAi.nombre_completo.split(' ').slice(1).join(' ') || null,
        company_name: isProf ? permitDataAi.nombre_completo : null,
        client_type: extra.clientType,
        dni: isProf ? null : permitDataAi.dni_cif,
        cif: isProf ? permitDataAi.dni_cif : null,
        address: permitDataAi.direccion,
        is_buyer: false,
        is_seller: true,
        acquisition_channel_id: extra.acquisitionChannelId,
        active: true,
        created_by: user.id,
      });
      clientId = newClient.id;
    }

    // 2. Resolve master brand
    const normBrand = permitDataAi.marca.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const { data: existingBrands } = await supabase.from('master_brands').select('*').ilike('normalized_name', normBrand);
    let brandId: string;
    let brandName: string;
    if (existingBrands && existingBrands.length > 0) {
      brandId = existingBrands[0].id;
      brandName = existingBrands[0].name;
    } else {
      const newBrand = await (await import('@/lib/supabase-api')).createMasterBrand(permitDataAi.marca, user.id);
      brandId = newBrand.id;
      brandName = newBrand.name;
    }

    // 3. Resolve master model
    const normModel = permitDataAi.modelo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const { data: existingModels } = await supabase.from('master_models').select('*').eq('brand_id', brandId).ilike('normalized_name', normModel);
    let modelId: string;
    let modelName: string;
    if (existingModels && existingModels.length > 0) {
      modelId = existingModels[0].id;
      modelName = existingModels[0].name;
    } else {
      const newModel = await (await import('@/lib/supabase-api')).createMasterModel({
        brand_id: brandId, name: permitDataAi.modelo, body_type: extra.bodyType, segment_id: extra.segmentId,
      }, user.id);
      modelId = newModel.id;
      modelName = newModel.name;
    }

    // 4. Resolve version if provided
    let versionId: string | null = null;
    let versionName = extra.version || '';
    if (versionName) {
      const normVer = versionName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const { data: existingVersions } = await supabase.from('master_versions').select('*').eq('master_model_id', modelId).ilike('normalized_name', normVer);
      if (existingVersions && existingVersions.length > 0) {
        versionId = existingVersions[0].id;
        versionName = existingVersions[0].name;
      } else {
        const newVer = await (await import('@/lib/supabase-api')).createMasterVersion({ master_model_id: modelId, name: versionName }, user.id);
        versionId = newVer.id;
        versionName = newVer.name;
      }
    }

    // 5. Create vehicle
    const vehicleClassMap: Record<string, string> = { turismo: 'turismo', mixto: 'mixto', industrial: 'industrial' };
    const vehicle = await createVehicle({
      plate: permitDataAi.matricula,
      vin: permitDataAi.vin,
      brand: brandName,
      model: modelName,
      version: versionName,
      vehicle_class: (vehicleClassMap[permitDataAi.tipo_legal] || 'turismo') as any,
      horsepower: permitDataAi.potencia,
      displacement: permitDataAi.cilindrada,
      first_registration: permitDataAi.fecha_primera_matriculacion || new Date().toISOString(),
      has_circulation_permit: true,
      master_brand_id: brandId,
      master_model_id: modelId,
      master_version_id: versionId,
      segment_id: extra.segmentId,
      body_type: extra.bodyType,
      segment_auto_assigned: true,
      needs_review: true,
      purchase_price: 0,
      pvp_base: 0,
      created_from: 'permiso_circulacion',
      owner_client_id: clientId,
    } as any, user.id);

    // 6. Upload document as vehicle document
    try {
      const { data: signedData } = await supabase.storage.from('smart-documents').createSignedUrl(docRecord.file_path, 120);
      if (signedData?.signedUrl) {
        const resp = await fetch(signedData.signedUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const mimeType = docRecord.file_name.match(/\.(jpg|jpeg|png)$/i) ? blob.type : 'application/pdf';
        const docFile = new File([blob], docRecord.file_name, { type: mimeType });
        await uploadDocument(docFile, vehicle.id, 'permiso_circulacion', user.id, profile?.full_name || '');
      }
    } catch (docErr: any) {
      console.error('Error copying document to vehicle documents:', docErr);
    }

    // 7. Update smart document record
    await supabase.from('smart_documents').update({
      status: 'confirmed', confirmed_at: new Date().toISOString(),
      linked_entity_type: 'vehicle', linked_entity_id: vehicle.id, linked_vehicle_id: vehicle.id,
    }).eq('id', docRecord.id);

    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    toast({ title: '✅ Vehículo y cliente creados', description: `${brandName} ${modelName} (${permitDataAi.matricula}) — Marcado como No disponible.` });

    const { data: linkedPurchase } = await supabase
      .from('vehicle_purchases')
      .select('id')
      .eq('vehicle_id', vehicle.id)
      .limit(1)
      .maybeSingle();

    if (linkedPurchase?.id) {
      toast({
        title: '📋 Ir al proceso de compra',
        description: 'Pulsa para abrir la operación de compra vinculada.',
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate(`/purchases/${linkedPurchase.id}`)}>
            Ir a compra
          </Button>
        ),
        duration: 10000,
      });
      navigate(`/vehicles/${vehicle.id}`);
    } else {
      navigate(`/vehicles/${vehicle.id}`);
    }
  };

  // ── MODE: SELECT ──
  if (mode === 'select') {
    return (
      <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Nuevo Vehículo</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Elige cómo quieres crear el vehículo</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setMode('manual')}>
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <PlusCircle className="h-12 w-12 text-primary" />
              <span className="font-semibold text-lg">Crear manualmente</span>
              <span className="text-sm text-muted-foreground text-center">Rellena los datos del vehículo a mano</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setMode('ai')}>
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <FileSearch className="h-12 w-12 text-primary" />
              <span className="font-semibold text-lg">Desde ficha técnica</span>
              <span className="text-sm text-muted-foreground text-center">Sube un PDF y la IA extraerá los datos</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setMode('permit')}>
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <FileText className="h-12 w-12 text-primary" />
              <span className="font-semibold text-lg">Desde Permiso Circulación</span>
              <span className="text-sm text-muted-foreground text-center">Crea cliente + vehículo desde el permiso</span>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── MODE: AI ──
  if (mode === 'ai') {
    return (
      <SmartDocumentFlow
        documentType="vehicle_technical_sheet"
        onConfirmVehicle={handleConfirmVehicle}
        onCancel={() => setMode('select')}
      />
    );
  }

  // ── MODE: PERMIT ──
  if (mode === 'permit') {
    return (
      <SmartDocumentFlow
        documentType="circulation_permit"
        onConfirmCirculationPermit={handleConfirmCirculationPermit}
        onCancel={() => setMode('select')}
      />
    );
  }

  // ── MODE: MANUAL ──
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => setMode('select')} className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Nuevo Vehículo</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Rellena los datos para dar de alta un vehículo</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleGenerate}
          disabled
          title="Edge Function `generate-vehicle` no desplegada. Rellena el formulario manualmente."
          className="border-amber-500/30 text-amber-700/60 cursor-not-allowed ml-11 sm:ml-0 shrink-0">
          <Sparkles className="h-4 w-4 mr-2" />
          Generar con IA (no disponible)
        </Button>
      </div>

      {aiExtras && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              ✨ Datos generados con IA — Se guardarán {aiExtras.expenses.length} gasto(s) y {aiExtras.notes.length} nota(s) al crear el vehículo.
            </p>
            <div className="mt-2 space-y-1">
              {aiExtras.expenses.map((ex, i) => (<p key={i} className="text-xs text-muted-foreground">💰 {ex.description}: {ex.amount}€ — {ex.supplier_name}</p>))}
              {aiExtras.notes.map((n, i) => (<p key={i} className="text-xs text-muted-foreground">📝 {n.author_name}: {n.content.substring(0, 80)}...</p>))}
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Master Vehicle Selector */}
        <MasterVehicleSelector values={masterValues} onChange={handleMasterChange} userId={user?.id || ''} />

        <Card>
          <CardHeader><CardTitle className="text-base">Identificación</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Matrícula *</Label><Input value={form.plate} onChange={e => set('plate', e.target.value)} required /></div>
            <div><Label>VIN</Label><Input value={form.vin} onChange={e => set('vin', e.target.value)} /></div>
            <div><Label>Color</Label><Input value={form.color} onChange={e => set('color', e.target.value)} /></div>
            <div>
              <Label>Clase</Label>
              <Select value={form.vehicle_class} onValueChange={v => set('vehicle_class', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="turismo">Turismo</SelectItem><SelectItem value="mixto">Mixto</SelectItem><SelectItem value="industrial">Industrial</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.vehicle_type} onValueChange={v => set('vehicle_type', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="nuevo">Nuevo</SelectItem><SelectItem value="ocasion">Ocasión</SelectItem><SelectItem value="usado">Usado</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motor</Label>
              <Select value={form.engine_type} onValueChange={v => set('engine_type', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gasolina">Gasolina</SelectItem><SelectItem value="diesel">Diésel</SelectItem><SelectItem value="hibrido">Híbrido</SelectItem><SelectItem value="electrico">Eléctrico</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transmisión</Label>
              <Select value={form.transmission} onValueChange={v => set('transmission', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="automatico">Automático</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Cilindrada (cc)</Label><Input type="number" value={form.displacement} onChange={e => set('displacement', e.target.value)} /></div>
            <div><Label>Potencia (CV)</Label><Input type="number" value={form.horsepower} onChange={e => set('horsepower', e.target.value)} /></div>
            <div><Label>Km entrada</Label><Input type="number" value={form.km_entry} onChange={e => set('km_entry', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Fechas y documentos</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>1ª Matriculación</Label><Input type="date" value={form.first_registration} onChange={e => set('first_registration', e.target.value)} /></div>
            <div><Label>ITV</Label><Input type="date" value={form.itv_date} onChange={e => set('itv_date', e.target.value)} /></div>
            <div><Label>Fecha compra</Label><Input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} /></div>
            <div><Label>Fecha exposición</Label><Input type="date" value={form.expo_date} onChange={e => set('expo_date', e.target.value)} /></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.has_second_key} onCheckedChange={v => set('has_second_key', !!v)} id="key2" /><Label htmlFor="key2">2ª llave</Label></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.has_technical_sheet} onCheckedChange={v => set('has_technical_sheet', !!v)} id="sheet" /><Label htmlFor="sheet">Ficha técnica</Label></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.has_circulation_permit} onCheckedChange={v => set('has_circulation_permit', !!v)} id="permit" /><Label htmlFor="permit">Permiso</Label></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.has_manual} onCheckedChange={v => set('has_manual', !!v)} id="manual" /><Label htmlFor="manual">Manual</Label></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Precios e impuestos</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Precio compra (€)</Label><Input type="number" step="0.01" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} /></div>
            <div><Label>PVP Base (€)</Label><Input type="number" step="0.01" value={form.pvp_base} onChange={e => set('pvp_base', e.target.value)} /></div>
            <div><Label>Precio profesionales (€)</Label><Input type="number" step="0.01" value={form.price_professionals} onChange={e => set('price_professionals', e.target.value)} /></div>
            <div><Label>Precio financiado (€)</Label><Input type="number" step="0.01" value={form.price_financed} onChange={e => set('price_financed', e.target.value)} /></div>
            <div><Label>Precio contado (€)</Label><Input type="number" step="0.01" value={form.price_cash} onChange={e => set('price_cash', e.target.value)} /></div>
            <div>
              <Label>Impuesto</Label>
              <Select value={form.tax_type} onValueChange={v => set('tax_type', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="igic">IGIC</SelectItem><SelectItem value="iva">IVA</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>% Impuesto</Label><Input type="number" value={form.tax_rate} onChange={e => set('tax_rate', e.target.value)} /></div>
            <div><Label>% IRPF</Label><Input type="number" value={form.irpf_rate} onChange={e => set('irpf_rate', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Ubicación</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <Label>Centro</Label>
              <Select value={form.center} onValueChange={v => set('center', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{branches.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setMode('select')}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{saving ? 'Guardando...' : 'Crear vehículo'}</Button>
        </div>
      </form>
    </div>
  );
}
