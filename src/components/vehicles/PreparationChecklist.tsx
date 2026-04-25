import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getPreparationItems, togglePreparationItem, updatePreparationItemNotes, getSuppliers, createRepairOrderFromChecklist } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, AlertTriangle, CheckCircle2, MessageSquare, Save, ExternalLink, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import type { VehiclePreparationItem, PreparationCategory, PreparationRole, PreparationStatus, PreparationExecutionType } from '@/lib/types';
import {
  PREPARATION_CATEGORY_LABELS,
  PREPARATION_CATEGORY_ICONS,
  PREPARATION_STATUS_LABELS,
  PREPARATION_STATUS_COLORS,
  PREPARATION_ROLE_LABELS,
  PREPARATION_ROLE_COLORS,
  PREPARATION_ROLE_ICONS,
  PREPARATION_EXECUTION_TYPE_LABELS,
  PREPARATION_EXECUTION_TYPE_ICONS,
} from '@/lib/types';

interface Props {
  vehicleId: string;
  purchaseId?: string;
  compact?: boolean;
}

const ROLES: PreparationRole[] = ['admin', 'sales', 'post_sale'];
const CATEGORIES: PreparationCategory[] = ['documentacion', 'recepcion', 'revision', 'costes', 'comercial'];

function getRoleStatus(items: VehiclePreparationItem[], role: PreparationRole) {
  const roleItems = items.filter(i => i.responsible_role === role);
  const total = roleItems.length;
  const completed = roleItems.filter(i => i.is_completed).length;
  const requiredTotal = roleItems.filter(i => i.is_required).length;
  const requiredCompleted = roleItems.filter(i => i.is_required && i.is_completed).length;
  const percent = requiredTotal > 0 ? Math.round((requiredCompleted / requiredTotal) * 100) : (total > 0 ? 100 : 0);
  const status: PreparationStatus = requiredCompleted >= requiredTotal && requiredTotal > 0
    ? 'completado'
    : completed > 0
    ? 'en_progreso'
    : 'pendiente';
  return { status, completed, required: requiredTotal, total, percent };
}

export function PreparationChecklist({ vehicleId, purchaseId, compact = false }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [repairDialogItem, setRepairDialogItem] = useState<VehiclePreparationItem | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [repairObservations, setRepairObservations] = useState('');
  const [creatingRepairOrder, setCreatingRepairOrder] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['preparation-items', vehicleId],
    queryFn: () => getPreparationItems(vehicleId),
    enabled: !!vehicleId,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
    enabled: !!repairDialogItem,
  });

  // Auto-preselect internal supplier when dialog opens
  const internalSupplier = suppliers.find(s => s.is_internal);
  const openRepairDialog = (item: VehiclePreparationItem) => {
    setRepairDialogItem(item);
    setRepairObservations(`Preparación vehículo: ${item.step_label}`);
    setSelectedSupplierId('');
  };

  // When suppliers load and no selection, preselect internal
  const effectiveSupplierId = selectedSupplierId || internalSupplier?.id || '';

  const total = items.length;
  const completed = items.filter(i => i.is_completed).length;
  const requiredTotal = items.filter(i => i.is_required).length;
  const requiredCompleted = items.filter(i => i.is_required && i.is_completed).length;
  const percent = requiredTotal > 0 ? Math.round((requiredCompleted / requiredTotal) * 100) : 0;

  const status: PreparationStatus = requiredCompleted >= requiredTotal && requiredTotal > 0
    ? 'completado'
    : completed > 0
    ? 'en_progreso'
    : 'pendiente';

  const filteredItems = items.filter(i =>
    (categoryFilter === 'all' || i.category === categoryFilter) &&
    (roleFilter === 'all' || i.responsible_role === roleFilter)
  );

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filteredItems.filter(i => i.category === cat);
    return acc;
  }, {} as Record<PreparationCategory, VehiclePreparationItem[]>);

  const handleToggle = async (item: VehiclePreparationItem) => {
    if (!user) return;
    // Only allow manual toggle for manual_check items
    if (item.execution_type !== 'manual_check') {
      toast.info('Este ítem se completa automáticamente desde su tarea u orden de reparación vinculada');
      return;
    }
    try {
      await togglePreparationItem(item.id, !item.is_completed, user.id);
      qc.invalidateQueries({ queryKey: ['preparation-items', vehicleId] });
      qc.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      toast.success(item.is_completed ? 'Tarea desmarcada' : 'Tarea completada');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveNote = async (itemId: string) => {
    try {
      await updatePreparationItemNotes(itemId, noteValue);
      qc.invalidateQueries({ queryKey: ['preparation-items', vehicleId] });
      setEditingNote(null);
      toast.success('Nota guardada');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCreateRepairOrder = async () => {
    if (!repairDialogItem || !user || !effectiveSupplierId) return;
    setCreatingRepairOrder(true);
    try {
      await createRepairOrderFromChecklist(
        repairDialogItem.id,
        vehicleId,
        effectiveSupplierId,
        user.id,
        repairDialogItem.purchase_id,
        repairObservations || `Preparación vehículo: ${repairDialogItem.step_label}`
      );
      qc.invalidateQueries({ queryKey: ['preparation-items', vehicleId] });
      setRepairDialogItem(null);
      setSelectedSupplierId('');
      setRepairObservations('');
      toast.success('Orden de reparación creada y vinculada al checklist');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreatingRepairOrder(false);
    }
  };

  if (isLoading) return <div className="text-muted-foreground text-sm py-8 text-center">Cargando checklist...</div>;
  if (total === 0) return <div className="text-muted-foreground text-sm py-8 text-center">No hay checklist de preparación</div>;

  const pendingRequired = items.filter(i => i.is_required && !i.is_completed);

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Preparación del vehículo</h3>
            </div>
            <Badge className={PREPARATION_STATUS_COLORS[status]}>
              {PREPARATION_STATUS_LABELS[status]}
            </Badge>
          </div>
          <Progress value={percent} className="h-3 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{requiredCompleted}/{requiredTotal} obligatorios · {completed}/{total} total</span>
            <span className="font-medium">{percent}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Role progress cards */}
      <div className="grid grid-cols-3 gap-3">
        {ROLES.map(role => {
          const rs = getRoleStatus(items, role);
          return (
            <Card key={role} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{PREPARATION_ROLE_ICONS[role]} {PREPARATION_ROLE_LABELS[role]}</span>
                  <Badge className={`text-[9px] px-1.5 ${PREPARATION_STATUS_COLORS[rs.status]}`}>
                    {PREPARATION_STATUS_LABELS[rs.status]}
                  </Badge>
                </div>
                <Progress value={rs.percent} className="h-2 mb-1" />
                <p className="text-[10px] text-muted-foreground">{rs.completed}/{rs.total} · {rs.percent}%</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Blocking items alert grouped by role */}
      {pendingRequired.length > 0 && pendingRequired.length <= 8 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-700">Tareas obligatorias pendientes</p>
                {ROLES.map(role => {
                  const rolePending = pendingRequired.filter(i => i.responsible_role === role);
                  if (rolePending.length === 0) return null;
                  return (
                    <div key={role}>
                      <p className="text-xs font-medium text-amber-700">{PREPARATION_ROLE_ICONS[role]} {PREPARATION_ROLE_LABELS[role]}</p>
                      <ul className="text-xs text-amber-600 mt-0.5 space-y-0.5">
                        {rolePending.slice(0, 3).map(i => <li key={i.id}>• {i.step_label}</li>)}
                        {rolePending.length > 3 && <li>... y {rolePending.length - 3} más</li>}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {!compact && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={roleFilter === 'all' ? 'default' : 'outline'} onClick={() => setRoleFilter('all')}>
              Todos los roles
            </Button>
            {ROLES.map(role => (
              <Button key={role} size="sm" variant={roleFilter === role ? 'default' : 'outline'} onClick={() => setRoleFilter(role)}>
                {PREPARATION_ROLE_ICONS[role]} {PREPARATION_ROLE_LABELS[role]}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={categoryFilter === 'all' ? 'default' : 'outline'} onClick={() => setCategoryFilter('all')}>
              Todas
            </Button>
            {CATEGORIES.map(cat => {
              const catItems = filteredItems.filter(i => i.category === cat);
              const catCompleted = catItems.filter(i => i.is_completed).length;
              return (
                <Button key={cat} size="sm" variant={categoryFilter === cat ? 'default' : 'outline'} onClick={() => setCategoryFilter(cat)}>
                  {PREPARATION_CATEGORY_ICONS[cat]} {PREPARATION_CATEGORY_LABELS[cat]}
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{catCompleted}/{catItems.length}</Badge>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Items grouped by category */}
      <Accordion type="multiple" defaultValue={CATEGORIES} className="space-y-2">
        {CATEGORIES.map(cat => {
          const catItems = grouped[cat];
          if (!catItems || catItems.length === 0) return null;
          const catCompleted = catItems.filter(i => i.is_completed).length;
          const allDone = catCompleted === catItems.length;
          return (
            <AccordionItem key={cat} value={cat} className="border rounded-lg px-4">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <span>{PREPARATION_CATEGORY_ICONS[cat]}</span>
                  <span className="font-medium">{PREPARATION_CATEGORY_LABELS[cat]}</span>
                  <Badge variant={allDone ? 'default' : 'secondary'} className="text-[10px]">
                    {catCompleted}/{catItems.length}
                  </Badge>
                  {allDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="space-y-1">
                  {catItems.map(item => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onEditNote={(item) => { setEditingNote(item.id); setNoteValue(item.notes || ''); }}
                      editingNote={editingNote}
                      noteValue={noteValue}
                      onNoteChange={setNoteValue}
                      onSaveNote={handleSaveNote}
                      onCancelNote={() => setEditingNote(null)}
                      onCreateRepairOrder={openRepairDialog}
                      onNavigateToTask={(taskId) => navigate('/tasks')}
                      onNavigateToRepair={(repairId) => navigate('/postventa/repairs')}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Create Repair Order Dialog */}
      <Dialog open={!!repairDialogItem} onOpenChange={(open) => !open && setRepairDialogItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear orden de reparación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Se creará una orden de reparación vinculada al ítem: <strong>{repairDialogItem?.step_label}</strong>
            </p>
            <div className="space-y-2">
              <Label>Proveedor / Taller</Label>
              <Select value={effectiveSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.active).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.is_internal ? '🏠 ' : ''}{s.name}
                      {s.is_internal ? ' (por defecto)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {internalSupplier && effectiveSupplierId === internalSupplier.id && (
                <p className="text-xs text-muted-foreground">Se usará el taller interno por defecto</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input value={repairObservations} onChange={e => setRepairObservations(e.target.value)} placeholder="Descripción del trabajo..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRepairDialogItem(null)}>Cancelar</Button>
            <Button onClick={handleCreateRepairOrder} disabled={!effectiveSupplierId || creatingRepairOrder}>
              {creatingRepairOrder ? 'Creando...' : 'Crear orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Extracted item row component ──────────────────────────

interface ChecklistItemRowProps {
  item: VehiclePreparationItem;
  onToggle: (item: VehiclePreparationItem) => void;
  onEditNote: (item: VehiclePreparationItem) => void;
  editingNote: string | null;
  noteValue: string;
  onNoteChange: (v: string) => void;
  onSaveNote: (id: string) => void;
  onCancelNote: () => void;
  onCreateRepairOrder: (item: VehiclePreparationItem) => void;
  onNavigateToTask: (taskId: string) => void;
  onNavigateToRepair: (repairId: string) => void;
}

function ChecklistItemRow({
  item, onToggle, onEditNote, editingNote, noteValue, onNoteChange, onSaveNote, onCancelNote,
  onCreateRepairOrder, onNavigateToTask, onNavigateToRepair,
}: ChecklistItemRowProps) {
  const isManual = item.execution_type === 'manual_check';
  const isTask = item.execution_type === 'task';
  const isRepair = item.execution_type === 'repair_order';
  const hasLinkedTask = isTask && !!item.linked_task_id;
  const hasLinkedRepair = isRepair && !!item.linked_repair_order_id;
  const needsRepairCreation = isRepair && !item.linked_repair_order_id;

  return (
    <div className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-muted/50 group">
      <Checkbox
        checked={item.is_completed}
        onCheckedChange={() => onToggle(item)}
        className="mt-0.5"
        disabled={!isManual}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
            {item.step_label}
          </span>
          {item.is_required ? (
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-600">Obligatorio</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1 py-0">Opcional</Badge>
          )}
          <Badge className={`text-[9px] px-1.5 py-0 ${PREPARATION_ROLE_COLORS[item.responsible_role]}`}>
            {PREPARATION_ROLE_ICONS[item.responsible_role]} {PREPARATION_ROLE_LABELS[item.responsible_role]}
          </Badge>
          {/* Execution type badge */}
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            {PREPARATION_EXECUTION_TYPE_ICONS[item.execution_type]} {PREPARATION_EXECUTION_TYPE_LABELS[item.execution_type]}
          </Badge>
        </div>

        {/* Linked entity actions */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {hasLinkedTask && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-primary" onClick={() => onNavigateToTask(item.linked_task_id!)}>
              <ExternalLink className="h-3 w-3 mr-1" /> Ver tarea
            </Button>
          )}
          {hasLinkedRepair && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-primary" onClick={() => onNavigateToRepair(item.linked_repair_order_id!)}>
              <ExternalLink className="h-3 w-3 mr-1" /> Ver orden
            </Button>
          )}
          {needsRepairCreation && !item.is_completed && (
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-amber-700 border-amber-500/40" onClick={() => onCreateRepairOrder(item)}>
              <Wrench className="h-3 w-3 mr-1" /> Crear orden de reparación
            </Button>
          )}
        </div>

        {item.notes && editingNote !== item.id && (
          <p className="text-xs text-muted-foreground mt-0.5">💬 {item.notes}</p>
        )}
        {editingNote === item.id ? (
          <div className="flex gap-2 mt-1">
            <Input value={noteValue} onChange={e => onNoteChange(e.target.value)} placeholder="Nota..." className="h-7 text-xs" />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onSaveNote(item.id)}>
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancelNote}>✕</Button>
          </div>
        ) : (
          <Button
            size="sm" variant="ghost"
            className="h-6 px-1.5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 mt-0.5"
            onClick={() => onEditNote(item)}
          >
            <MessageSquare className="h-3 w-3 mr-1" />{item.notes ? 'Editar nota' : 'Añadir nota'}
          </Button>
        )}
      </div>
    </div>
  );
}
