import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Plus, History, Loader2, Trash2, Pencil, Sparkles } from 'lucide-react';
import { InsuranceDialog } from './InsuranceDialog';
import SmartDocumentFlow from '@/components/smart-documents/SmartDocumentFlow';
import type { VehicleInsurance, InsuranceStatus } from '@/lib/types';
import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

function getInsuranceStatus(ins: VehicleInsurance): InsuranceStatus {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(ins.start_date);
  const end = new Date(ins.end_date);
  if (now < start) return 'futuro';
  if (now > end) return 'caducado';
  return 'activo';
}

function InsuranceBadge({ status, daysLeft }: { status: InsuranceStatus; daysLeft?: number }) {
  if (status === 'activo' && daysLeft !== undefined && daysLeft <= 30) {
    return <Badge className="bg-status-reparacion/15 text-status-reparacion border-status-reparacion/30 text-xs">⚠ Vence en {daysLeft}d</Badge>;
  }
  if (status === 'activo') return <Badge className="bg-status-disponible/15 text-status-disponible border-status-disponible/30 text-xs">🛡 Activo</Badge>;
  if (status === 'caducado') return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">❌ Caducado</Badge>;
  return <Badge className="bg-muted text-muted-foreground text-xs">Futuro</Badge>;
}

async function fetchInsurances(vehicleId: string): Promise<VehicleInsurance[]> {
  const { data, error } = await supabase
    .from('vehicle_insurances')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as VehicleInsurance[];
}

export function InsuranceSection({ vehicleId }: { vehicleId: string }) {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIns, setEditingIns] = useState<VehicleInsurance | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [aiDocId, setAiDocId] = useState<string | null>(null);

  const { data: insurances = [], isLoading } = useQuery({
    queryKey: ['vehicle-insurances', vehicleId],
    queryFn: () => fetchInsurances(vehicleId),
  });

  const currentInsurance = insurances.find(ins => getInsuranceStatus(ins) === 'activo');
  const currentStatus: InsuranceStatus | null = currentInsurance ? getInsuranceStatus(currentInsurance) : null;
  const daysLeft = currentInsurance ? differenceInDays(new Date(currentInsurance.end_date), new Date()) : undefined;

  const handleSave = async (data: Partial<VehicleInsurance>) => {
    if (!user) return;
    setSaving(true);
    try {
      if (editingIns) {
        const { error } = await supabase
          .from('vehicle_insurances')
          .update({ ...data, updated_at: new Date().toISOString() } as any)
          .eq('id', editingIns.id);
        if (error) throw error;
        toast({ title: '✅ Seguro actualizado' });
      } else {
        const insertData: any = {
          ...data,
          vehicle_id: vehicleId,
          created_by: user.id,
        };
        if (aiDocId) insertData.pdf_document_id = aiDocId;
        const { error } = await supabase
          .from('vehicle_insurances')
          .insert(insertData);
        if (error) throw error;
        toast({ title: '✅ Seguro creado' });
      }
      qc.invalidateQueries({ queryKey: ['vehicle-insurances', vehicleId] });
      qc.invalidateQueries({ queryKey: ['audit-vehicle', vehicleId] });
      setDialogOpen(false);
      setEditingIns(null);
      setAiData(null);
      setAiFields(new Set());
      setAiDocId(null);
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('vehicle_insurances').delete().eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['vehicle-insurances', vehicleId] });
      toast({ title: '🗑️ Seguro eliminado' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleAiConfirm = async (extractedData: any, docRecord: { id: string; file_path: string; file_name: string }) => {
    // Map AI extracted fields to dialog data
    const mapped = {
      insurer_name: extractedData.compania_aseguradora || '',
      policy_number: extractedData.numero_poliza || '',
      start_date: extractedData.fecha_inicio || '',
      end_date: extractedData.fecha_vencimiento || '',
      insurance_type: extractedData.tipo_seguro || 'individual',
    };
    const filled = new Set<string>();
    for (const [k, v] of Object.entries(extractedData)) {
      if (v !== '' && v !== 0 && v !== null && v !== undefined) filled.add(k);
    }

    // Mark smart doc as confirmed
    await supabase
      .from('smart_documents')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        linked_entity_type: 'insurance',
        linked_vehicle_id: vehicleId,
      })
      .eq('id', docRecord.id);

    setAiData(mapped);
    setAiFields(filled);
    setAiDocId(null); // PDF stays in smart-documents, not linked as vehicle doc
    setAiMode(false);
    setEditingIns(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="border shadow-sm mb-4">
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border shadow-sm mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" /> Seguro del Vehículo
            </CardTitle>
            <div className="flex items-center gap-2">
              {insurances.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setHistoryOpen(true)}>
                  <History className="h-3 w-3 mr-1" /> Histórico ({insurances.length})
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAiMode(true)}>
                <Sparkles className="h-3 w-3 mr-1" /> Desde PDF
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setEditingIns(null); setAiData(null); setAiFields(new Set()); setDialogOpen(true); }}>
                <Plus className="h-3 w-3 mr-1" /> Añadir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentInsurance ? (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <InsuranceBadge status={currentStatus!} daysLeft={daysLeft} />
                  <span className="text-sm font-medium">{currentInsurance.insurer_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">#{currentInsurance.policy_number}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vigente hasta {format(new Date(currentInsurance.end_date), 'dd/MM/yyyy', { locale: es })}
                  {daysLeft !== undefined && ` (${daysLeft} días)`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingIns(currentInsurance); setDialogOpen(true); }}>
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          ) : insurances.length > 0 ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">❌ Seguro caducado</Badge>
              <span className="text-xs text-muted-foreground">Última póliza: {insurances[0].insurer_name} (vencida {format(new Date(insurances[0].end_date), 'dd/MM/yyyy', { locale: es })})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-muted-foreground">Sin seguro registrado</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insurance Dialog */}
      <InsuranceDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingIns(null); setAiData(null); }}
        onSave={handleSave}
        insurance={editingIns}
        existingInsurances={insurances}
        saving={saving}
        aiData={aiData}
        aiFields={aiFields}
      />

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={v => !v && setHistoryOpen(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-sm">Histórico de Seguros</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Aseguradora</TableHead>
                <TableHead>Nº Póliza</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insurances.map(ins => {
                const st = getInsuranceStatus(ins);
                const dl = st === 'activo' ? differenceInDays(new Date(ins.end_date), new Date()) : undefined;
                return (
                  <TableRow key={ins.id}>
                    <TableCell><InsuranceBadge status={st} daysLeft={dl} /></TableCell>
                    <TableCell className="text-xs font-medium">{ins.insurer_name}</TableCell>
                    <TableCell className="text-xs font-mono">{ins.policy_number}</TableCell>
                    <TableCell className="text-xs">{format(new Date(ins.start_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-xs">{format(new Date(ins.end_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-xs capitalize">{ins.insurance_type}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingIns(ins); setHistoryOpen(false); setDialogOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>¿Eliminar seguro?</AlertDialogTitle><AlertDialogDescription>Se eliminará la póliza {ins.policy_number} permanentemente.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(ins.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
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
        </DialogContent>
      </Dialog>

      {/* AI Mode */}
      <Dialog open={aiMode} onOpenChange={v => !v && setAiMode(false)}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0">
          <SmartDocumentFlow
            documentType="insurance_policy"
            vehicleId={vehicleId}
            hideVehicleMatch
            onConfirmInsurance={handleAiConfirm}
            onCancel={() => setAiMode(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Exported helper to get active insurance for a vehicle */
export async function getActiveInsuranceForVehicle(vehicleId: string): Promise<VehicleInsurance | null> {
  const insurances = await fetchInsurances(vehicleId);
  return insurances.find(ins => getInsuranceStatus(ins) === 'activo') || null;
}

export { getInsuranceStatus, InsuranceBadge };
