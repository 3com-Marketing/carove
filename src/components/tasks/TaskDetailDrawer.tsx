import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskComments } from './TaskComments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, User, Car, UserCheck, Pencil, Trash2 } from 'lucide-react';

const priorityConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  baja: { label: '🟢 Baja', variant: 'secondary' },
  media: { label: '🟡 Media', variant: 'outline' },
  alta: { label: '🟠 Alta', variant: 'default' },
  urgente: { label: '🔴 Urgente', variant: 'destructive' },
};

interface TaskDetailDrawerProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDeleted: () => void;
  onStatusChange: () => void;
}

export function TaskDetailDrawer({ task, open, onOpenChange, onEdit, onDeleted, onStatusChange }: TaskDetailDrawerProps) {
  if (!task) return null;
  const p = priorityConfig[task.priority] || priorityConfig.media;
  const plateMatch = task.title?.match(/^\[([^\]]+)\]/);
  const plate = plateMatch ? plateMatch[1].split(' - ')[0]?.trim() : null;
  const cleanTitle = task.title?.replace(/^\[[^\]]+\]\s*/, '') || task.title;

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus as any }).eq('id', task.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Estado actualizado');
    onStatusChange();
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Tarea eliminada');
    onDeleted();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left pr-6">
            {plate && <Badge variant="default" className="text-xs font-mono font-bold mr-2 bg-primary/10 text-primary border-primary/20">{plate}</Badge>}
            {cleanTitle}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-5 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={p.variant}>{p.label}</Badge>
            <Select value={task.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-auto h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
          )}

          <div className="space-y-2 text-sm">
            {task.assigned_to_name && (
              <div className="flex items-center gap-2 text-foreground">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span>Asignado a: <strong>{task.assigned_to_name}</strong></span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Límite: {format(new Date(task.due_date), "dd MMM yyyy HH:mm", { locale: es })}</span>
              </div>
            )}
            {task.vehicle_label && (
              <div className="flex items-center gap-2 text-foreground">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span>{task.vehicle_label}</span>
              </div>
            )}
            {task.buyer_label && (
              <div className="flex items-center gap-2 text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{task.buyer_label}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Creada por {task.created_by_name || 'Usuario'} el {format(new Date(task.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3 w-3 mr-1" /> Editar</Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}><Trash2 className="h-3 w-3 mr-1" /> Eliminar</Button>
          </div>

          <hr className="border-border" />

          <TaskComments taskId={task.id} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
