import { useQuery } from '@tanstack/react-query';
import { getReservationTimeline } from '@/lib/supabase-api';
import { TIMELINE_EVENT_LABELS } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FileText, PenLine, Banknote, CheckCircle2, XCircle, Clock,
  RotateCcw, Send, Truck, CalendarPlus, AlertTriangle, Plus,
} from 'lucide-react';

const EVENT_ICONS: Record<string, any> = {
  reservation_created: Plus,
  deposit_auto_calculated: Banknote,
  deposit_manually_changed: PenLine,
  reservation_document_generated: FileText,
  deposit_receipt_generated: FileText,
  passed_to_signature: Send,
  sales_contract_generated: FileText,
  proforma_generated: FileText,
  marked_as_signed: PenLine,
  payment_registered: Banknote,
  marked_as_paid: CheckCircle2,
  delivered: Truck,
  expired: AlertTriangle,
  cancelled: XCircle,
  extended: CalendarPlus,
  deposit_recalculated: RotateCcw,
  document_regenerated: RotateCcw,
};

interface Props {
  reservationId: string;
}

export function ReservationTimeline({ reservationId }: Props) {
  const { data: events = [] } = useQuery({
    queryKey: ['reservation-timeline', reservationId],
    queryFn: () => getReservationTimeline(reservationId),
  });

  if (events.length === 0) return (
    <p className="text-xs text-muted-foreground py-4 text-center">Sin actividad registrada.</p>
  );

  return (
    <div className="relative space-y-0">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
      {events.map((ev) => {
        const Icon = EVENT_ICONS[ev.event_type] || Clock;
        return (
          <div key={ev.id} className="flex gap-3 py-2 relative">
            <div className="z-10 flex items-center justify-center w-6 h-6 rounded-full bg-muted border shrink-0">
              <Icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">
                {TIMELINE_EVENT_LABELS[ev.event_type] || ev.event_type}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {ev.actor_name && <span>{ev.actor_name} · </span>}
                {format(new Date(ev.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
