import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { BODY_TYPES } from '@/lib/constants';
import {
  getSegments, createSegment, updateSegment,
  getMasterBrands, createMasterBrand, updateMasterBrand, validateMasterBrand,
  getMasterModels, createMasterModel, updateMasterModel, validateMasterModel,
  getMasterVersions, createMasterVersion, updateMasterVersion, validateMasterVersion,
} from '@/lib/supabase-api';
import { SegmentDialog } from '@/components/settings/SegmentDialog';
import { BrandDialog } from '@/components/settings/BrandDialog';
import { MasterModelDialog } from '@/components/settings/MasterModelDialog';
import { VersionDialog } from '@/components/settings/VersionDialog';
import type { VehicleSegment, MasterBrand, MasterModel, MasterVersion } from '@/lib/types';
import { format } from 'date-fns';

export default function VehicleMastersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id || '';

  const [tab, setTab] = useState('segments');
  const [segDialog, setSegDialog] = useState<{ open: boolean; segment?: VehicleSegment | null }>({ open: false });
  const [brandDialog, setBrandDialog] = useState<{ open: boolean; brand?: MasterBrand | null }>({ open: false });
  const [modelDialog, setModelDialog] = useState<{ open: boolean; model?: MasterModel | null }>({ open: false });
  const [versionDialog, setVersionDialog] = useState<{ open: boolean; version?: MasterVersion | null }>({ open: false });

  // Version filters
  const [verFilterBrand, setVerFilterBrand] = useState('all');
  const [verFilterModel, setVerFilterModel] = useState('all');
  const [verFilterStatus, setVerFilterStatus] = useState('all');
  const [verFilterValidation, setVerFilterValidation] = useState('all');

  const { data: segments = [] } = useQuery({ queryKey: ['vehicle-segments'], queryFn: getSegments });
  const { data: brands = [] } = useQuery({ queryKey: ['master-brands'], queryFn: getMasterBrands });
  const { data: models = [] } = useQuery({ queryKey: ['master-models'], queryFn: () => getMasterModels() });
  const { data: versions = [] } = useQuery({ queryKey: ['master-versions'], queryFn: () => getMasterVersions() });

  const pendingBrands = brands.filter(b => !b.is_validated).length;
  const pendingModels = models.filter(m => !m.is_validated).length;
  const pendingVersions = versions.filter(v => !v.is_validated).length;

  // Mutations
  const segMut = useMutation({
    mutationFn: async (data: Partial<VehicleSegment> & { id?: string }) => {
      if (data.id) return updateSegment(data.id, data);
      return createSegment(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle-segments'] }); setSegDialog({ open: false }); toast.success('Segmento guardado'); },
    onError: (e: any) => toast.error(e.message),
  });

  const brandMut = useMutation({
    mutationFn: async (data: { id?: string; name: string; active: boolean }) => {
      if (data.id) return updateMasterBrand(data.id, { name: data.name, active: data.active, normalized_name: data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') } as any);
      return createMasterBrand(data.name, userId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-brands'] }); setBrandDialog({ open: false }); toast.success('Marca guardada'); },
    onError: (e: any) => toast.error(e.message),
  });

  const modelMut = useMutation({
    mutationFn: async (data: { id?: string; brand_id: string; name: string; body_type: string; segment_id: string; active: boolean }) => {
      if (data.id) return updateMasterModel(data.id, data as any);
      return createMasterModel({ brand_id: data.brand_id, name: data.name, body_type: data.body_type, segment_id: data.segment_id }, userId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-models'] }); setModelDialog({ open: false }); toast.success('Modelo guardado'); },
    onError: (e: any) => toast.error(e.message),
  });

  const versionMut = useMutation({
    mutationFn: async (data: { id?: string; master_model_id: string; name: string; active: boolean }) => {
      if (data.id) return updateMasterVersion(data.id, { name: data.name, active: data.active, normalized_name: data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') } as any);
      return createMasterVersion({ master_model_id: data.master_model_id, name: data.name }, userId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-versions'] }); setVersionDialog({ open: false }); toast.success('Versión guardada'); },
    onError: (e: any) => {
      if (e.message?.includes('duplicate') || e.message?.includes('unique')) {
        toast.error('Esta versión ya existe para este modelo.');
      } else {
        toast.error(e.message);
      }
    },
  });

  const valBrandMut = useMutation({
    mutationFn: (id: string) => validateMasterBrand(id, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-brands'] }); toast.success('Marca validada'); },
  });

  const valModelMut = useMutation({
    mutationFn: (id: string) => validateMasterModel(id, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-models'] }); toast.success('Modelo validado'); },
  });

  const valVersionMut = useMutation({
    mutationFn: (id: string) => validateMasterVersion(id, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['master-versions'] }); toast.success('Versión validada'); },
  });

  const bodyLabel = (v: string) => BODY_TYPES.find(bt => bt.value === v)?.label || v;
  const segmentName = (id: string) => segments.find(s => s.id === id)?.name || '—';
  const brandName = (id: string) => brands.find(b => b.id === id)?.name || '—';
  const modelName = (id: string) => models.find(m => m.id === id)?.name || '—';
  const brandOfModel = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    return model ? brandName(model.brand_id) : '—';
  };

  // Filtered versions
  const filteredVersions = versions.filter(v => {
    const model = models.find(m => m.id === v.master_model_id);
    if (verFilterBrand !== 'all' && model?.brand_id !== verFilterBrand) return false;
    if (verFilterModel !== 'all' && v.master_model_id !== verFilterModel) return false;
    if (verFilterStatus === 'active' && !v.active) return false;
    if (verFilterStatus === 'inactive' && v.active) return false;
    if (verFilterValidation === 'validated' && !v.is_validated) return false;
    if (verFilterValidation === 'pending' && v.is_validated) return false;
    return true;
  });

  const modelsForBrandFilter = verFilterBrand !== 'all' ? models.filter(m => m.brand_id === verFilterBrand) : models;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Datos Maestros de Vehículos</h1>
        <p className="text-muted-foreground">Gestión de segmentos, marcas, modelos maestros y versiones</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab('brands')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pendingBrands}</div>
            <p className="text-sm text-muted-foreground">Marcas pendientes de validación</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab('models')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pendingModels}</div>
            <p className="text-sm text-muted-foreground">Modelos pendientes de validación</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTab('versions')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pendingVersions}</div>
            <p className="text-sm text-muted-foreground">Versiones pendientes de validación</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{segments.length}</div>
            <p className="text-sm text-muted-foreground">Segmentos configurados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="brands">
            Marcas {pendingBrands > 0 && <Badge variant="destructive" className="ml-1 text-xs">{pendingBrands}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="models">
            Modelos {pendingModels > 0 && <Badge variant="destructive" className="ml-1 text-xs">{pendingModels}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="versions">
            Versiones {pendingVersions > 0 && <Badge variant="destructive" className="ml-1 text-xs">{pendingVersions}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── Segments Tab ── */}
        <TabsContent value="segments" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setSegDialog({ open: true, segment: null })}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Segmento
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Ejemplos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{s.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{s.examples}</TableCell>
                    <TableCell>{s.active ? <Badge variant="outline">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => setSegDialog({ open: true, segment: s })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Brands Tab ── */}
        <TabsContent value="brands" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setBrandDialog({ open: true, brand: null })}>
              <Plus className="h-4 w-4 mr-1" /> Nueva Marca
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Validación</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.active ? <Badge variant="outline">Activa</Badge> : <Badge variant="secondary">Inactiva</Badge>}</TableCell>
                    <TableCell>
                      {b.is_validated
                        ? <Badge variant="outline" className="border-primary text-primary">Validada</Badge>
                        : <Badge variant="destructive">Pendiente</Badge>}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {!b.is_validated && (
                        <Button size="icon" variant="ghost" onClick={() => valBrandMut.mutate(b.id)} title="Validar">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => setBrandDialog({ open: true, brand: b })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Models Tab ── */}
        <TabsContent value="models" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setModelDialog({ open: true, model: null })}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Modelo
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Carrocería</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Validación</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{brandName(m.brand_id)}</TableCell>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{bodyLabel(m.body_type)}</TableCell>
                    <TableCell>{segmentName(m.segment_id)}</TableCell>
                    <TableCell>
                      {m.is_validated
                        ? <Badge variant="outline" className="border-primary text-primary">Validado</Badge>
                        : <Badge variant="destructive">Pendiente</Badge>}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      {!m.is_validated && (
                        <Button size="icon" variant="ghost" onClick={() => valModelMut.mutate(m.id)} title="Validar">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => setModelDialog({ open: true, model: m })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {models.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay modelos maestros configurados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Versions Tab ── */}
        <TabsContent value="versions" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={verFilterBrand} onValueChange={v => { setVerFilterBrand(v); setVerFilterModel('all'); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={verFilterModel} onValueChange={setVerFilterModel}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Modelo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los modelos</SelectItem>
                {modelsForBrandFilter.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={verFilterStatus} onValueChange={setVerFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verFilterValidation} onValueChange={setVerFilterValidation}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Validación" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="validated">Validadas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button size="sm" onClick={() => setVersionDialog({ open: true, version: null })}>
                <Plus className="h-4 w-4 mr-1" /> Nueva Versión
              </Button>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo Maestro</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Activa</TableHead>
                  <TableHead>Validación</TableHead>
                  <TableHead>Fecha creación</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVersions.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>{brandOfModel(v.master_model_id)}</TableCell>
                    <TableCell>{modelName(v.master_model_id)}</TableCell>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>{v.active ? <Badge variant="outline">Sí</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>
                      {v.is_validated
                        ? <Badge variant="outline" className="border-primary text-primary">Validada</Badge>
                        : <Badge variant="destructive">Pendiente</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(v.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="flex gap-1">
                      {!v.is_validated && (
                        <Button size="icon" variant="ghost" onClick={() => valVersionMut.mutate(v.id)} title="Validar">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => setVersionDialog({ open: true, version: v })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredVersions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay versiones configuradas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SegmentDialog
        open={segDialog.open}
        onOpenChange={o => setSegDialog(s => ({ ...s, open: o }))}
        segment={segDialog.segment}
        onSave={data => segMut.mutate({ ...data, id: segDialog.segment?.id })}
        loading={segMut.isPending}
      />
      <BrandDialog
        open={brandDialog.open}
        onOpenChange={o => setBrandDialog(s => ({ ...s, open: o }))}
        brand={brandDialog.brand}
        onSave={data => brandMut.mutate({ ...data, id: brandDialog.brand?.id })}
        loading={brandMut.isPending}
      />
      <MasterModelDialog
        open={modelDialog.open}
        onOpenChange={o => setModelDialog(s => ({ ...s, open: o }))}
        model={modelDialog.model}
        brands={brands}
        segments={segments}
        onSave={data => modelMut.mutate({ ...data, id: modelDialog.model?.id })}
        loading={modelMut.isPending}
      />
      <VersionDialog
        open={versionDialog.open}
        onOpenChange={o => setVersionDialog(s => ({ ...s, open: o }))}
        version={versionDialog.version}
        brands={brands}
        models={models}
        onSave={data => versionMut.mutate({ ...data, id: versionDialog.version?.id })}
        loading={versionMut.isPending}
      />
    </div>
  );
}
