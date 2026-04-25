import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import type { VehicleInsurance } from '@/lib/types';

interface InsuranceDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<VehicleInsurance>) => Promise<void>;
  insurance?: VehicleInsurance | null;
  existingInsurances?: VehicleInsurance[];
  saving?: boolean;
  /** Pre-filled data from AI extraction */
  aiData?: {
    insurer_name?: string;
    policy_number?: string;
    start_date?: string;
    end_date?: string;
    insurance_type?: string;
  } | null;
  aiFields?: Set<string>;
}

function AiLabel({ children, hasAiValue }: { children: React.ReactNode; hasAiValue: boolean }) {
  return (
    <Label className="flex items-center gap-1.5">
      {children}
      {hasAiValue && <Sparkles className="h-3 w-3 text-primary" />}
    </Label>
  );
}

export function InsuranceDialog({ open, onClose, onSave, insurance, existingInsurances = [], saving, aiData, aiFields = new Set() }: InsuranceDialogProps) {
  const [insurerName, setInsurerName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [insuranceType, setInsuranceType] = useState('individual');
  const [observations, setObservations] = useState('');
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [overlapConfirmed, setOverlapConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      if (insurance) {
        setInsurerName(insurance.insurer_name);
        setPolicyNumber(insurance.policy_number);
        setStartDate(insurance.start_date);
        setEndDate(insurance.end_date);
        setInsuranceType(insurance.insurance_type);
        setObservations(insurance.observations || '');
      } else if (aiData) {
        setInsurerName(aiData.insurer_name || '');
        setPolicyNumber(aiData.policy_number || '');
        setStartDate(aiData.start_date || '');
        setEndDate(aiData.end_date || '');
        setInsuranceType(aiData.insurance_type || 'individual');
        setObservations('');
      } else {
        setInsurerName('');
        setPolicyNumber('');
        setStartDate('');
        setEndDate('');
        setInsuranceType('individual');
        setObservations('');
      }
      setOverlapWarning(null);
      setOverlapConfirmed(false);
    }
  }, [open, insurance, aiData]);

  useEffect(() => {
    if (!startDate || !endDate) { setOverlapWarning(null); return; }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const overlap = existingInsurances.find(ins => {
      if (insurance && ins.id === insurance.id) return false;
      const iStart = new Date(ins.start_date);
      const iEnd = new Date(ins.end_date);
      return start <= iEnd && end >= iStart;
    });
    if (overlap) {
      setOverlapWarning(`Se solapa con póliza ${overlap.policy_number} (${overlap.insurer_name}): ${overlap.start_date} - ${overlap.end_date}`);
      setOverlapConfirmed(false);
    } else {
      setOverlapWarning(null);
    }
  }, [startDate, endDate, existingInsurances, insurance]);

  const isValid = insurerName.trim() && policyNumber.trim() && startDate && endDate && endDate >= startDate;
  const canSave = isValid && (!overlapWarning || overlapConfirmed);

  const handleSave = async () => {
    await onSave({
      insurer_name: insurerName.trim(),
      policy_number: policyNumber.trim(),
      start_date: startDate,
      end_date: endDate,
      insurance_type: insuranceType as any,
      observations: observations.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">{insurance ? 'Editar Seguro' : 'Nuevo Seguro'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <AiLabel hasAiValue={aiFields.has('compania_aseguradora')}>Compañía aseguradora</AiLabel>
              <Input value={insurerName} onChange={e => setInsurerName(e.target.value)} placeholder="Mapfre, AXA, Allianz..." />
            </div>
            <div>
              <AiLabel hasAiValue={aiFields.has('numero_poliza')}>Nº Póliza</AiLabel>
              <Input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={insuranceType} onValueChange={setInsuranceType}>
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
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <AiLabel hasAiValue={aiFields.has('fecha_vencimiento')}>Fecha vencimiento</AiLabel>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            {endDate && startDate && endDate < startDate && (
              <p className="col-span-2 text-xs text-destructive">La fecha de vencimiento no puede ser anterior a la de inicio</p>
            )}
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Notas adicionales..." className="min-h-[60px]" />
          </div>
          {overlapWarning && (
            <Alert className="border-status-reparacion/50 bg-status-reparacion/5">
              <AlertTriangle className="h-4 w-4 text-status-reparacion" />
              <AlertDescription className="text-sm">
                <p className="font-medium">Solapamiento detectado</p>
                <p className="text-xs mt-1">{overlapWarning}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setOverlapConfirmed(true)} disabled={overlapConfirmed}>
                  {overlapConfirmed ? 'Confirmado ✓' : 'Confirmar y continuar'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !canSave}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {insurance ? 'Guardar' : 'Crear seguro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
