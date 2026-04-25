import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Eye, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface RecommendationCardProps {
  title: string;
  description: string;
  category?: string;
  severity?: 'info' | 'warning' | 'critical';
  status?: string;
  estimatedImpact?: string;
  recommendedAction?: string;
  dataSource?: string;
  onAccept?: () => void;
  onIgnore?: () => void;
  onReview?: () => void;
  showActions?: boolean;
}

const severityConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'default' as const },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', badge: 'secondary' as const },
  critical: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
};

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  ignorada: 'Ignorada',
  revisada: 'Revisada',
};

export function RecommendationCard({
  title, description, category, severity = 'info', status = 'pendiente',
  estimatedImpact, recommendedAction, dataSource, onAccept, onIgnore, onReview, showActions = true,
}: RecommendationCardProps) {
  const sev = severityConfig[severity];
  const SevIcon = sev.icon;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className={`p-1.5 rounded-md ${sev.bg} mt-0.5`}>
              <SevIcon className={`h-4 w-4 ${sev.color}`} />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {category && <Badge variant="outline" className="mt-1 text-[10px]">{category}</Badge>}
            </div>
          </div>
          <Badge variant={status === 'aceptada' ? 'default' : status === 'ignorada' ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
            {statusLabels[status] || status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{description}</p>
        {recommendedAction && (
          <div className="text-xs"><span className="font-medium">Acción recomendada:</span> {recommendedAction}</div>
        )}
        {estimatedImpact && (
          <div className="text-xs"><span className="font-medium">Impacto estimado:</span> {estimatedImpact}</div>
        )}
        {dataSource && (
          <div className="text-[10px] text-muted-foreground">Origen: {dataSource}</div>
        )}
        {showActions && status === 'pendiente' && (
          <div className="flex gap-2 pt-1">
            {onAccept && <Button size="sm" variant="default" onClick={onAccept} className="h-7 text-xs"><Check className="h-3 w-3 mr-1" />Aceptar</Button>}
            {onReview && <Button size="sm" variant="outline" onClick={onReview} className="h-7 text-xs"><Eye className="h-3 w-3 mr-1" />Revisar</Button>}
            {onIgnore && <Button size="sm" variant="ghost" onClick={onIgnore} className="h-7 text-xs"><X className="h-3 w-3 mr-1" />Ignorar</Button>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
