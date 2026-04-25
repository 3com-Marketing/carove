import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Landmark } from 'lucide-react';

interface FinanceVolumeEntry {
  entity: string;
  operations: number;
  volume: number;
}

interface FinanceVolumeTableProps {
  data: FinanceVolumeEntry[];
}

export function FinanceVolumeTable({ data }: FinanceVolumeTableProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" /> Volumen por entidad financiera
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin operaciones financiadas este mes</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidad</TableHead>
                <TableHead className="text-right">Operaciones</TableHead>
                <TableHead className="text-right">Volumen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{entry.entity}</TableCell>
                  <TableCell className="text-right">{entry.operations}</TableCell>
                  <TableCell className="text-right font-medium">{entry.volume.toLocaleString('es-ES')}€</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
