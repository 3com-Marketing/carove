import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMasterBrands, getMasterModels, getMasterVersions, getSegments, createMasterBrand, createMasterModel, createMasterVersion } from '@/lib/supabase-api';
import { BODY_TYPES } from '@/lib/constants';
import type { MasterBrand, MasterModel, MasterVersion, VehicleSegment } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

export interface MasterVehicleValues {
  master_brand_id: string;
  master_model_id: string;
  master_version_id: string;
  body_type: string;
  segment_id: string;
  brand: string;
  model: string;
  version: string;
}

interface Props {
  values: MasterVehicleValues;
  onChange: (values: Partial<MasterVehicleValues>) => void;
  userId: string;
  color?: string;
  onColorChange?: (color: string) => void;
}

export default function MasterVehicleSelector({ values, onChange, userId, color, onColorChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: brands = [] } = useQuery({ queryKey: ['master-brands'], queryFn: getMasterBrands });
  const { data: models = [] } = useQuery({ queryKey: ['master-models', values.master_brand_id], queryFn: () => getMasterModels(values.master_brand_id), enabled: !!values.master_brand_id });
  const { data: versions = [] } = useQuery({ queryKey: ['master-versions', values.master_model_id], queryFn: () => getMasterVersions(values.master_model_id), enabled: !!values.master_model_id });
  const { data: segments = [] } = useQuery({ queryKey: ['segments'], queryFn: getSegments });

  const activeBrands = brands.filter(b => b.active);
  const activeModels = models.filter(m => m.active);
  const activeVersions = versions.filter(v => v.active);

  // ── Create new dialogs ──
  const [newBrandOpen, setNewBrandOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelOpen, setNewModelOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelBodyType, setNewModelBodyType] = useState('');
  const [newModelSegmentId, setNewModelSegmentId] = useState('');
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Handlers ──
  const handleBrandChange = (brandId: string) => {
    if (brandId === '__new__') {
      setNewBrandName('');
      setNewBrandOpen(true);
      return;
    }
    const brand = activeBrands.find(b => b.id === brandId);
    onChange({
      master_brand_id: brandId,
      brand: brand?.name || '',
      master_model_id: '',
      model: '',
      master_version_id: '',
      version: '',
      body_type: '',
      segment_id: '',
    });
  };

  const handleModelChange = (modelId: string) => {
    if (modelId === '__new__') {
      setNewModelName('');
      setNewModelBodyType('');
      setNewModelSegmentId('');
      setNewModelOpen(true);
      return;
    }
    const model = activeModels.find(m => m.id === modelId);
    if (model) {
      onChange({
        master_model_id: modelId,
        model: model.name,
        body_type: model.body_type,
        segment_id: model.segment_id,
        master_version_id: '',
        version: '',
      });
    }
  };

  const handleVersionChange = (versionId: string) => {
    if (versionId === '__new__') {
      setNewVersionName('');
      setNewVersionOpen(true);
      return;
    }
    if (versionId === '_none') {
      onChange({ master_version_id: '', version: '' });
      return;
    }
    const ver = activeVersions.find(v => v.id === versionId);
    onChange({ master_version_id: versionId, version: ver?.name || '' });
  };

  // ── Create brand ──
  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    setCreating(true);
    try {
      const brand = await createMasterBrand(newBrandName.trim(), userId);
      qc.invalidateQueries({ queryKey: ['master-brands'] });
      onChange({
        master_brand_id: brand.id,
        brand: brand.name,
        master_model_id: '',
        model: '',
        master_version_id: '',
        version: '',
        body_type: '',
        segment_id: '',
      });
      setNewBrandOpen(false);
      toast({ title: '✅ Marca creada', description: `${brand.name} — pendiente de validación` });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // ── Create model ──
  const handleCreateModel = async () => {
    if (!newModelName.trim() || !newModelBodyType || !newModelSegmentId) {
      toast({ title: 'Campos obligatorios', description: 'Nombre, carrocería y segmento son obligatorios.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const model = await createMasterModel({
        brand_id: values.master_brand_id,
        name: newModelName.trim(),
        body_type: newModelBodyType,
        segment_id: newModelSegmentId,
      }, userId);
      qc.invalidateQueries({ queryKey: ['master-models', values.master_brand_id] });
      onChange({
        master_model_id: model.id,
        model: model.name,
        body_type: model.body_type,
        segment_id: model.segment_id,
        master_version_id: '',
        version: '',
      });
      setNewModelOpen(false);
      toast({ title: '✅ Modelo creado', description: `${model.name} — pendiente de validación` });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // ── Create version ──
  const handleCreateVersion = async () => {
    if (!newVersionName.trim()) return;
    setCreating(true);
    try {
      const ver = await createMasterVersion({ master_model_id: values.master_model_id, name: newVersionName.trim() }, userId);
      qc.invalidateQueries({ queryKey: ['master-versions', values.master_model_id] });
      onChange({ master_version_id: ver.id, version: ver.name });
      setNewVersionOpen(false);
      toast({ title: '✅ Versión creada', description: `${ver.name} — pendiente de validación` });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const selectedSegment = segments.find(s => s.id === values.segment_id);

  return (
    <>
      {/* Line 1: Brand */}
      <div>
        <Label>Marca *</Label>
        <Select value={values.master_brand_id || undefined} onValueChange={handleBrandChange}>
          <SelectTrigger><SelectValue placeholder="Seleccionar marca" /></SelectTrigger>
          <SelectContent>
            {activeBrands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            <SelectItem value="__new__"><Plus className="h-3 w-3 inline mr-1" />Crear nueva marca...</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Line 2: Model */}
      <div>
        <Label>Modelo *</Label>
        <Select value={values.master_model_id || undefined} onValueChange={handleModelChange} disabled={!values.master_brand_id}>
          <SelectTrigger><SelectValue placeholder={values.master_brand_id ? 'Seleccionar modelo' : 'Selecciona marca primero'} /></SelectTrigger>
          <SelectContent>
            {activeModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            <SelectItem value="__new__"><Plus className="h-3 w-3 inline mr-1" />Crear nuevo modelo...</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Line 2: Body type (read-only from model) */}
      <div>
        <Label>Carrocería *</Label>
        <Input
          value={BODY_TYPES.find(bt => bt.value === values.body_type)?.label || values.body_type || ''}
          disabled
          placeholder="Se asigna desde el modelo"
        />
      </div>

      {/* Line 2: Segment (read-only) */}
      <div>
        <Label>Segmento *</Label>
        <Input
          value={selectedSegment ? `${selectedSegment.code} — ${selectedSegment.name}` : ''}
          disabled
          placeholder="Se asigna desde el modelo"
        />
      </div>

      {/* Line 3: Version */}
      <div>
        <Label>Versión</Label>
        <Select value={values.master_version_id || '_none'} onValueChange={handleVersionChange} disabled={!values.master_model_id}>
          <SelectTrigger><SelectValue placeholder={values.master_model_id ? 'Seleccionar versión' : 'Selecciona modelo primero'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— Sin versión —</SelectItem>
            {activeVersions.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            <SelectItem value="__new__"><Plus className="h-3 w-3 inline mr-1" />Crear nueva versión...</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Line 3: Color */}
      {onColorChange !== undefined && (
        <div>
          <Label>Color</Label>
          <Input value={color || ''} onChange={e => onColorChange(e.target.value)} />
        </div>
      )}

      {/* ── Create Brand Dialog ── */}
      <Dialog open={newBrandOpen} onOpenChange={setNewBrandOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva Marca</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre de la marca</Label><Input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Ej: Volkswagen" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewBrandOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateBrand} disabled={creating || !newBrandName.trim()}>{creating ? 'Creando...' : 'Crear marca'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Model Dialog ── */}
      <Dialog open={newModelOpen} onOpenChange={setNewModelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Modelo Maestro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre del modelo</Label><Input value={newModelName} onChange={e => setNewModelName(e.target.value)} placeholder="Ej: Golf" /></div>
            <div><Label>Carrocería *</Label>
              <Select value={newModelBodyType || undefined} onValueChange={setNewModelBodyType}>
                <SelectTrigger><SelectValue placeholder="Seleccionar carrocería" /></SelectTrigger>
                <SelectContent>{BODY_TYPES.map(bt => <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Segmento *</Label>
              <Select value={newModelSegmentId || undefined} onValueChange={setNewModelSegmentId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar segmento" /></SelectTrigger>
                <SelectContent>{segments.filter(s => s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewModelOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateModel} disabled={creating || !newModelName.trim() || !newModelBodyType || !newModelSegmentId}>{creating ? 'Creando...' : 'Crear modelo'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Version Dialog ── */}
      <Dialog open={newVersionOpen} onOpenChange={setNewVersionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva Versión</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre de la versión</Label><Input value={newVersionName} onChange={e => setNewVersionName(e.target.value)} placeholder="Ej: 1.6 TDI Advance" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewVersionOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateVersion} disabled={creating || !newVersionName.trim()}>{creating ? 'Creando...' : 'Crear versión'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
