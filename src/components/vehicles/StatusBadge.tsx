import { Badge } from '@/components/ui/badge';
import { VEHICLE_STATUSES } from '@/lib/constants';
import type { VehicleStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: VehicleStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = VEHICLE_STATUSES[status];
  return (
    <Badge className={cn('font-medium border-0', config.className, className)}>
      {config.label}
    </Badge>
  );
}
