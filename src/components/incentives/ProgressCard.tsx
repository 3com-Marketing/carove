import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';

interface ProgressCardProps {
  label: string;
  current: number;
  target: number;
  icon: LucideIcon;
  format?: 'number' | 'currency';
}

export function ProgressCard({ label, current, target, icon: Icon, format = 'number' }: ProgressCardProps) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const displayCurrent = format === 'currency' ? `${current.toLocaleString('es-ES')}€` : current;
  const displayTarget = format === 'currency' ? `${target.toLocaleString('es-ES')}€` : target;

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{displayCurrent} <span className="text-sm font-normal text-muted-foreground">/ {displayTarget}</span></p>
          </div>
          <span className="text-lg font-semibold text-primary">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </CardContent>
    </Card>
  );
}
