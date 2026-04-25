import { Badge } from '@/components/ui/badge';
import { OPERATIVE_LABELS } from '@/lib/constants';
import type { OperativeStatus } from '@/lib/types';
import { Wrench, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperativeBadgeProps {
  status: OperativeStatus;
  className?: string;
}

const ICONS = {
  wrench: Wrench,
  truck: Truck,
};

export function OperativeBadge({ status, className }: OperativeBadgeProps) {
  const config = OPERATIVE_LABELS[status];
  if (!config) return null;

  const Icon = ICONS[config.icon as keyof typeof ICONS];

  return (
    <Badge className={cn('font-medium border-0 gap-1', config.className, className)}>
      {Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
