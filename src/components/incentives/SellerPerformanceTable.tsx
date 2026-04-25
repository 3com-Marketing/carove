import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';

interface PerformanceEntry {
  full_name: string;
  total_sales: number;
  total_margin: number;
  total_financed: number;
  bonus_total: number;
}

interface SellerPerformanceTableProps {
  data: PerformanceEntry[];
}

export function SellerPerformanceTable({ data }: SellerPerformanceTableProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Rendimiento por vendedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead className="text-right">Financiaciones</TableHead>
                <TableHead className="text-right">Bonus est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{entry.full_name}</TableCell>
                  <TableCell className="text-right">{entry.total_sales}</TableCell>
                  <TableCell className="text-right">{entry.total_margin.toLocaleString('es-ES')}€</TableCell>
                  <TableCell className="text-right">{entry.total_financed}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{entry.bonus_total.toLocaleString('es-ES')}€</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
