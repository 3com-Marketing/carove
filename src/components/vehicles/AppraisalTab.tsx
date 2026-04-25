import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { AppraisalDialog } from './AppraisalDialog';
import type { AppraisalFormData } from './AppraisalDialog';
import type { Vehicle, Buyer, CompanySettings } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/constants';
import { Plus, Eye, Printer, Check, X, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleAppraisal {
  id: string;
  vehicle_id: string;
  appraiser_id: string;
  appraiser_name: string;
  appraisal_date: string;
  status: string;
  exterior_score: number;
  exterior_notes: string;
  interior_score: number;
  interior_notes: string;
  mechanical_score: number;
  mechanical_notes: string;
  tires_score: number;
  tires_notes: string;
  electrical_score: number;
  electrical_notes: string;
  overall_score: number;
  market_value: number;
  offer_price: number;
  internal_notes: string;
  created_at: string;
  updated_at: string;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  borrador: { label: 'Borrador', variant: 'secondary' },
  completada: { label: 'Completada', variant: 'default' },
  aceptada: { label: 'Aceptada', variant: 'default' },
  rechazada: { label: 'Rechazada', variant: 'destructive' },
};

const SCORE_LABEL = (s: number) => s >= 4.5 ? 'Excelente' : s >= 3.5 ? 'Bueno' : s >= 2.5 ? 'Regular' : 'Deficiente';
const SCORE_COLOR = (s: number) => s >= 4.5 ? 'text-primary' : s >= 3.5 ? 'text-emerald-500' : s >= 2.5 ? 'text-yellow-500' : 'text-destructive';

function buildAppraisalHtml(appraisal: VehicleAppraisal, vehicle: Vehicle, owner: Buyer | null, company: CompanySettings | null, logoUrl: string | null) {
  const scores = [
    { label: 'Exterior', score: appraisal.exterior_score, notes: appraisal.exterior_notes },
    { label: 'Interior', score: appraisal.interior_score, notes: appraisal.interior_notes },
    { label: 'Mecánica', score: appraisal.mechanical_score, notes: appraisal.mechanical_notes },
    { label: 'Neumáticos', score: appraisal.tires_score, notes: appraisal.tires_notes },
    { label: 'Electricidad', score: appraisal.electrical_score, notes: appraisal.electrical_notes },
  ];

  const overallLabel = SCORE_LABEL(appraisal.overall_score);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:system-ui,sans-serif;margin:0;padding:20px;font-size:13px;color:#222}
    .header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #16a34a;padding-bottom:12px;margin-bottom:20px}
    .header img{max-height:50px}
    .header h1{font-size:16px;margin:0;color:#16a34a}
    .header p{margin:2px 0;font-size:11px;color:#666}
    h2{font-size:14px;margin:20px 0 8px;color:#333;border-bottom:1px solid #eee;padding-bottom:4px}
    table{width:100%;border-collapse:collapse;margin:8px 0}
    td,th{padding:6px 10px;text-align:left;border:1px solid #ddd;font-size:12px}
    th{background:#f5f5f5;font-weight:600}
    .score-bar{display:inline-block;width:${100}%;height:8px;background:#eee;border-radius:4px;position:relative}
    .score-fill{height:100%;border-radius:4px}
    .summary{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;text-align:center}
    .summary .big{font-size:28px;font-weight:700;color:#16a34a}
    .price{font-size:22px;font-weight:700;color:#16a34a;text-align:center;margin:12px 0}
    .footer{margin-top:40px;font-size:10px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:8px}
    .sig{margin-top:50px;display:flex;justify-content:space-between}
    .sig div{width:40%;border-top:1px solid #333;padding-top:4px;font-size:11px;text-align:center}
  </style></head><body>
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="logo"/>` : ''}
      <div>
        <h1>${company?.company_name || 'Empresa'}</h1>
        <p>${company?.address || ''} ${company?.city || ''} ${company?.postal_code || ''}</p>
        <p>CIF: ${company?.tax_id || ''} · Tel: ${company?.phone || ''}</p>
      </div>
    </div>

    <h2>Informe de Tasación</h2>
    <table>
      <tr><th>Fecha</th><td>${formatDate(appraisal.appraisal_date)}</td><th>Tasador</th><td>${appraisal.appraiser_name}</td></tr>
    </table>

    <h2>Datos del Vehículo</h2>
    <table>
      <tr><th>Marca / Modelo</th><td>${vehicle.brand} ${vehicle.model}</td><th>Versión</th><td>${vehicle.version}</td></tr>
      <tr><th>Matrícula</th><td>${vehicle.plate}</td><th>VIN</th><td>${vehicle.vin || '—'}</td></tr>
      <tr><th>Kilómetros</th><td>${(vehicle.km_entry || 0).toLocaleString('es-ES')} km</td><th>Color</th><td>${vehicle.color}</td></tr>
      <tr><th>Motor</th><td>${vehicle.engine_type}</td><th>Cambio</th><td>${vehicle.transmission}</td></tr>
      <tr><th>1ª Matriculación</th><td>${formatDate(vehicle.first_registration)}</td><th></th><td></td></tr>
    </table>

    <h2>Datos del Propietario</h2>
    <table>
      <tr><th>Nombre</th><td>${owner ? (owner.client_type === 'profesional' ? owner.company_name || owner.name : `${owner.name} ${owner.last_name || ''}`) : '—'}</td></tr>
      <tr><th>DNI / CIF</th><td>${owner?.dni || owner?.cif || '—'}</td></tr>
      <tr><th>Teléfono</th><td>${owner?.phone || '—'}</td></tr>
    </table>

    <h2>Estado General del Vehículo</h2>
    <table>
      <tr><th style="width:25%">Apartado</th><th style="width:15%">Puntuación</th><th>Observaciones</th></tr>
      ${scores.map(s => `<tr><td><strong>${s.label}</strong></td><td style="text-align:center">${s.score} / 5</td><td>${s.notes || '—'}</td></tr>`).join('')}
    </table>

    <div class="summary">
      <div>Puntuación global</div>
      <div class="big">${appraisal.overall_score.toFixed(1)} / 5</div>
      <div style="font-size:14px;margin-top:4px">${overallLabel}</div>
    </div>

    <h2>Valoración Económica</h2>
    <table>
      <tr><th>Valor de mercado (referencia)</th><td style="text-align:right;font-weight:600">${formatCurrency(appraisal.market_value)}</td></tr>
      <tr><th>Precio ofertado</th><td style="text-align:right;font-weight:700;color:#16a34a;font-size:16px">${formatCurrency(appraisal.offer_price)}</td></tr>
    </table>

    <div class="sig">
      <div>El tasador</div>
      <div>El propietario</div>
    </div>

    <div class="footer">${company?.legal_text || ''}</div>
  </body></html>`;
}

interface AppraisalTabProps {
  vehicle: Vehicle;
  owner: Buyer | null;
}

export function AppraisalTab({ vehicle, owner }: AppraisalTabProps) {
  const { user, profile } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppraisal, setEditingAppraisal] = useState<VehicleAppraisal | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');

  const { data: appraisals = [], isLoading } = useQuery({
    queryKey: ['vehicle-appraisals', vehicle.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_appraisals' as any)
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .order('appraisal_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as VehicleAppraisal[];
    },
  });

  const { data: company } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
      return data as CompanySettings | null;
    },
  });

  const { data: logoUrl } = useQuery({
    queryKey: ['company-logo', company?.logo_url],
    queryFn: async () => {
      if (!company?.logo_url) return null;
      if (company.logo_url.startsWith('http')) return company.logo_url;
      try {
        const { data } = await supabase.storage.from('company-assets').createSignedUrl(company.logo_url, 1800);
        return data?.signedUrl || null;
      } catch { return null; }
    },
    enabled: !!company?.logo_url,
  });

  const calcOverall = (d: AppraisalFormData) =>
    Number(((d.exterior_score + d.interior_score + d.mechanical_score + d.tires_score + d.electrical_score) / 5).toFixed(1));

  const handleSave = async (data: AppraisalFormData) => {
    if (!user) return;
    const overall = calcOverall(data);
    const payload = {
      ...data,
      overall_score: overall,
      vehicle_id: vehicle.id,
      appraiser_id: user.id,
      appraiser_name: profile?.full_name || user.email || '',
    };

    if (editingAppraisal) {
      const { error } = await supabase
        .from('vehicle_appraisals' as any)
        .update(payload as any)
        .eq('id', editingAppraisal.id);
      if (error) throw error;
      toast({ title: '✅ Tasación actualizada' });
    } else {
      const { error } = await supabase
        .from('vehicle_appraisals' as any)
        .insert(payload as any);
      if (error) throw error;
      toast({ title: '✅ Tasación creada' });
    }

    qc.invalidateQueries({ queryKey: ['vehicle-appraisals', vehicle.id] });
    setEditingAppraisal(null);
  };

  const handleStatusChange = async (appraisalId: string, newStatus: string) => {
    const { error } = await supabase
      .from('vehicle_appraisals' as any)
      .update({ status: newStatus } as any)
      .eq('id', appraisalId);
    if (error) {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
      return;
    }

    // If accepted, offer to set purchase_price
    if (newStatus === 'aceptada') {
      const appraisal = appraisals.find(a => a.id === appraisalId);
      if (appraisal && appraisal.offer_price > 0) {
        const { error: updateErr } = await supabase
          .from('vehicles')
          .update({ purchase_price: appraisal.offer_price, updated_by: user?.id } as any)
          .eq('id', vehicle.id);
        if (!updateErr) {
          qc.invalidateQueries({ queryKey: ['vehicle', vehicle.id] });
          toast({ title: '✅ Tasación aceptada', description: `Precio de compra actualizado a ${formatCurrency(appraisal.offer_price)}` });
        }
      }
    } else {
      toast({ title: '✅ Estado actualizado' });
    }

    qc.invalidateQueries({ queryKey: ['vehicle-appraisals', vehicle.id] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vehicle_appraisals' as any).delete().eq('id', id);
    if (error) {
      toast({ title: '❌ Error', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['vehicle-appraisals', vehicle.id] });
    toast({ title: '🗑️ Tasación eliminada' });
  };

  const handlePreview = (a: VehicleAppraisal) => {
    const html = buildAppraisalHtml(a, vehicle, owner, company || null, logoUrl || null);
    setPreviewHtml(html);
    setPreviewTitle(`Tasación — ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`);
    setPreviewOpen(true);
  };

  const openEdit = (a: VehicleAppraisal) => {
    setEditingAppraisal(a);
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingAppraisal(null);
    setDialogOpen(true);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tasaciones del vehículo</h3>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nueva tasación</Button>
      </div>

      {appraisals.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No hay tasaciones registradas para este vehículo.
          </CardContent>
        </Card>
      ) : (
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tasador</TableHead>
                  <TableHead className="text-center">Puntuación</TableHead>
                  <TableHead className="text-right">Valor mercado</TableHead>
                  <TableHead className="text-right">Oferta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appraisals.map(a => {
                  const st = STATUS_MAP[a.status] || STATUS_MAP.borrador;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{formatDate(a.appraisal_date)}</TableCell>
                      <TableCell className="text-sm">{a.appraiser_name}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn('font-semibold text-sm', SCORE_COLOR(a.overall_score))}>
                          {a.overall_score.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">({SCORE_LABEL(a.overall_score)})</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(a.market_value)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(a.offer_price)}</TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePreview(a)} title="Ver documento">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {a.status === 'borrador' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)} title="Editar">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {a.status === 'completada' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => handleStatusChange(a.id, 'aceptada')} title="Aceptar">
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleStatusChange(a.id, 'rechazada')} title="Rechazar">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {a.status === 'borrador' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(a.id, 'completada')}>
                              Completar
                            </Button>
                          )}
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Eliminar">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar tasación?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(a.id)}>Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AppraisalDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingAppraisal(null); }}
        onSave={handleSave}
        initialData={editingAppraisal || undefined}
        title={editingAppraisal ? 'Editar Tasación' : 'Nueva Tasación'}
        vehicle={{
          brand: vehicle.brand,
          model: vehicle.model,
          version: vehicle.version,
          year: vehicle.first_registration ? new Date(vehicle.first_registration).getFullYear() : new Date().getFullYear(),
          km: vehicle.km_entry || 0,
          fuel: vehicle.engine_type,
          transmission: vehicle.transmission,
          id: vehicle.id,
        }}
      />

      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={previewTitle}
        html={previewHtml}
        actions={[
          {
            icon: 'printer',
            tooltip: 'Imprimir',
            onClick: () => {
              const iframe = document.querySelector<HTMLIFrameElement>('.appraisal-preview-iframe');
              try { iframe?.contentWindow?.print(); } catch { window.print(); }
            },
          },
        ]}
      />
    </div>
  );
}
