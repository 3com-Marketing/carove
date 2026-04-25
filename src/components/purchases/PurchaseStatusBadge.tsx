import { Badge } from '@/components/ui/badge';
import { PURCHASE_STATUS_LABELS, PURCHASE_STATUS_COLORS } from '@/lib/types';
import type { PurchaseStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PurchaseStatusBadgeProps {
  status: PurchaseStatus;
  className?: string;
}

export function PurchaseStatusBadge({ status, className }: PurchaseStatusBadgeProps) {
  return (
    <Badge className={cn('font-medium border', PURCHASE_STATUS_COLORS[status], className)}>
      {PURCHASE_STATUS_LABELS[status]}
    </Badge>
  );
}
