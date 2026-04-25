import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Radar } from 'lucide-react';

interface SellerRadarData {
  full_name: string;
  total_sales: number;
  total_margin: number;
  total_financed: number;
  target_sales: number;
  target_margin: number;
  target_financed: number;
}

function getStatus(data: SellerRadarData): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;

  const salesPct = data.target_sales > 0 ? data.total_sales / data.target_sales : 1;
  const marginPct = data.target_margin > 0 ? data.total_margin / data.target_margin : 1;
  const financedPct = data.target_financed > 0 ? data.total_financed / data.target_financed : 1;

  if (salesPct >= 0.8 && marginPct >= 0.8 && financedPct >= 0.8) {
    return { label: 'Excelente', variant: 'default' };
  }

  const aboveHalf = [salesPct >= 0.5, marginPct >= 0.5, financedPct >= 0.5].filter(Boolean).length;
  if (aboveHalf >= 2) {
    return { label: 'Estable', variant: 'secondary' };
  }

  if (monthProgress > 0.5 && (salesPct < 0.5 || marginPct < 0.5)) {
    return { label: 'Riesgo', variant: 'destructive' };
  }

  return { label: 'Estable', variant: 'secondary' };
}

interface CommercialRadarProps {
  sellers: SellerRadarData[];
}

export function CommercialRadar({ sellers }: CommercialRadarProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Radar className="h-4 w-4 text-primary" />
          Radar Comercial
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sellers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-center">Ventas</TableHead>
                <TableHead className="text-center">Margen</TableHead>
                <TableHead className="text-center">Financ.</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.map((s, i) => {
                const status = getStatus(s);
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-center">{s.total_sales}/{s.target_sales}</TableCell>
                    <TableCell className="text-center">{s.total_margin.toLocaleString('es-ES')}€</TableCell>
                    <TableCell className="text-center">{s.total_financed}/{s.target_financed}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
