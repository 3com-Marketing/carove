import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

interface LevelProgressCardProps {
  currentPoints: number;
  currentLevel: string | null;
  levels: { name: string; min_points: number }[];
}

export function LevelProgressCard({ currentPoints, currentLevel, levels }: LevelProgressCardProps) {
  const sorted = [...levels].sort((a, b) => a.min_points - b.min_points);
  const currentIdx = sorted.findIndex(l => l.name === currentLevel);
  const nextLevel = currentIdx >= 0 && currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;
  const currentMin = currentIdx >= 0 ? sorted[currentIdx].min_points : 0;
  const nextMin = nextLevel ? nextLevel.min_points : currentPoints;
  const range = nextMin - currentMin;
  const progress = range > 0 ? Math.min(((currentPoints - currentMin) / range) * 100, 100) : 100;

  const levelColors: Record<string, string> = {
    'Bronce': 'bg-amber-700 text-white',
    'Plata': 'bg-slate-400 text-white',
    'Oro': 'bg-yellow-500 text-white',
    'Elite': 'bg-primary text-primary-foreground',
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Nivel Comercial</span>
          </div>
          <Badge className={levelColors[currentLevel || ''] || 'bg-muted text-muted-foreground'}>
            {currentLevel || 'Sin nivel'}
          </Badge>
        </div>
        <div className="text-2xl font-bold">{currentPoints} pts</div>
        {nextLevel ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentLevel}</span>
              <span>{nextLevel.name} ({nextLevel.min_points} pts)</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Faltan {Math.max(nextLevel.min_points - currentPoints, 0)} pts para {nextLevel.name}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nivel máximo alcanzado</p>
        )}
      </CardContent>
    </Card>
  );
}
