import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Medal } from 'lucide-react';

interface RankingEntry {
  user_id: string;
  full_name: string;
  total_sales: number;
  total_margin: number;
}

interface TeamRankingProps {
  data: RankingEntry[];
}

export function TeamRanking({ data }: TeamRankingProps) {
  const sorted = [...data].sort((a, b) => b.total_sales - a.total_sales);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Medal className="h-4 w-4 text-amber-500" /> Ranking mensual
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin datos para este mes</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((entry, i) => (
                <TableRow key={entry.user_id}>
                  <TableCell className="text-lg">{medals[i] || i + 1}</TableCell>
                  <TableCell className="font-medium">{entry.full_name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{entry.total_sales}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{entry.total_margin.toLocaleString('es-ES')}€</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
