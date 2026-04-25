import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar, UserCheck, AlertTriangle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const priorityColors: Record<string, string> = {
  baja: 'border-l-emerald-500',
  media: 'border-l-amber-400',
  alta: 'border-l-orange-500',
  urgente: 'border-l-red-500',
};

interface TaskKanbanCardProps {
  task: any;
  onClick: () => void;
}

/** Extract plate from title like "[1234ABC - Golf] ..." or from vehicle_label */
function extractPlate(task: any): string | null {
  const titleMatch = task.title?.match(/^\[([^\]]+)\]/);
  if (titleMatch) {
    const plate = titleMatch[1].split(' - ')[0]?.trim();
    if (plate) return plate;
  }
  if (task.vehicle_label) {
    return task.vehicle_label.split(' - ')[0]?.trim() || null;
  }
  return null;
}

/** Get display title without the [PLATE - MODEL] prefix */
function getCleanTitle(title: string): string {
  return title?.replace(/^\[[^\]]+\]\s*/, '') || title;
}

export function TaskKanbanCard({ task, onClick }: TaskKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { task } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completada';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));
  const plate = extractPlate(task);
  const cleanTitle = getCleanTitle(task.title);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-3 cursor-pointer border-l-4 ${priorityColors[task.priority] || ''} hover:shadow-md transition-shadow bg-card`}
    >
      {plate && (
        <Badge variant="default" className="text-[10px] font-mono font-bold mb-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
          {plate}
        </Badge>
      )}
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">{cleanTitle}</p>
      <div className="flex flex-wrap gap-1.5">
        {task.assigned_to_name && (
          <Badge variant="secondary" className="text-[10px] gap-1 py-0">
            <UserCheck className="h-3 w-3" />{task.assigned_to_name.split(' ')[0]}
          </Badge>
        )}
        {task.due_date && (
          <Badge variant={isOverdue ? 'destructive' : isDueToday ? 'default' : 'outline'} className="text-[10px] gap-1 py-0">
            {isOverdue && <AlertTriangle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            {format(new Date(task.due_date), "dd MMM", { locale: es })}
          </Badge>
        )}
      </div>
    </Card>
  );
}
