import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { TaskKanbanCard } from '@/components/tasks/TaskKanbanCard';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

const COLUMNS = [
  { id: 'pendiente', label: 'Pendiente', color: 'bg-amber-500' },
  { id: 'en_curso', label: 'En Curso', color: 'bg-blue-500' },
  { id: 'completada', label: 'Completada', color: 'bg-emerald-500' },
  { id: 'cancelada', label: 'Cancelada', color: 'bg-muted-foreground' },
];

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-[200px] space-y-2 transition-colors rounded-lg p-1 ${isOver ? 'bg-accent/50' : ''}`}>
      {children}
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setTasks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTasks]);

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !(t.assigned_to_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAssignee === 'me' && t.assigned_to !== user?.id) return false;
    if (filterAssignee === 'unassigned' && t.assigned_to) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;
    if (!COLUMNS.some(c => c.id === newStatus)) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const { error } = await supabase.from('tasks').update({ status: newStatus as any }).eq('id', taskId);
    if (error) { toast.error(error.message); loadTasks(); }
  };

  const handleEditFromDetail = () => {
    setDetailOpen(false);
    setEditTask(detailTask);
    setDialogOpen(true);
  };

  const uniqueAssignees = [...new Set(tasks.filter(t => t.assigned_to_name).map(t => t.assigned_to_name))];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestor de Tareas</h1>
          <p className="text-sm text-muted-foreground">Asigna, organiza y haz seguimiento de tareas del equipo</p>
        </div>
        <Button onClick={() => { setEditTask(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nueva Tarea
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tarea..." className="pl-9" />
        </div>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="me">Mis tareas</SelectItem>
            <SelectItem value="unassigned">Sin asignar</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Prioridad</SelectItem>
            <SelectItem value="urgente">🔴 Urgente</SelectItem>
            <SelectItem value="alta">🟠 Alta</SelectItem>
            <SelectItem value="media">🟡 Media</SelectItem>
            <SelectItem value="baja">🟢 Baja</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border border-border rounded-md">
          <Button size="sm" variant={view === 'kanban' ? 'default' : 'ghost'} onClick={() => setView('kanban')} className="rounded-r-none">
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')} className="rounded-l-none">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map(col => {
              const colTasks = filtered.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                    <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                    <Badge variant="secondary" className="ml-auto text-xs">{colTasks.length}</Badge>
                  </div>
                  <DroppableColumn id={col.id}>
                    <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {colTasks.map(t => (
                        <TaskKanbanCard key={t.id} task={t} onClick={() => { setDetailTask(t); setDetailOpen(true); }} />
                      ))}
                    </SortableContext>
                    {colTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Sin tareas</p>
                    )}
                  </DroppableColumn>
                </div>
              );
            })}
          </div>
        </DndContext>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No hay tareas</p>}
          {filtered.map(t => {
            const isOverdue = t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completada';
            const plateMatch = t.title?.match(/^\[([^\]]+)\]/);
            const plate = plateMatch ? plateMatch[1].split(' - ')[0]?.trim() : (t.vehicle_label ? t.vehicle_label.split(' - ')[0]?.trim() : null);
            const cleanTitle = t.title?.replace(/^\[[^\]]+\]\s*/, '') || t.title;
            return (
              <Card key={t.id} className="p-3 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setDetailTask(t); setDetailOpen(true); }}>
                <div className={`h-3 w-3 rounded-full shrink-0 ${COLUMNS.find(c => c.id === t.status)?.color || 'bg-muted'}`} />
                {plate && (
                  <Badge variant="default" className="text-[10px] font-mono font-bold shrink-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                    {plate}
                  </Badge>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{cleanTitle}</p>
                  <p className="text-xs text-muted-foreground">{t.assigned_to_name || 'Sin asignar'}</p>
                </div>
                {t.due_date && (
                  <Badge variant={isOverdue ? 'destructive' : 'outline'} className="text-[10px] shrink-0">
                    {format(new Date(t.due_date), "dd MMM", { locale: es })}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px] shrink-0">{t.priority}</Badge>
              </Card>
            );
          })}
        </div>
      )}

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editTask} onSaved={loadTasks} />
      <TaskDetailDrawer
        task={detailTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEditFromDetail}
        onDeleted={loadTasks}
        onStatusChange={() => { loadTasks(); }}
      />
    </div>
  );
}
