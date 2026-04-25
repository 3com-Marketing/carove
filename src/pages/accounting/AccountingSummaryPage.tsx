import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BarChart3, FileText, TrendingUp, TrendingDown, Receipt, Lock, Unlock, Loader2 } from 'lucide-react';
import { getMonthlyAccountingSummary, getAccountingPeriods, closeAccountingYear, openAccountingYear } from '@/lib/supabase-api';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function AccountingSummaryPage() {
  const now = new Date();
  const [month, setMonth] = useState((now.getMonth() + 1).toString());
  const [year, setYear] = useState(now.getFullYear().toString());
  const { isAdmin } = useRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [confirmClose, setConfirmClose] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<number | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['accounting-summary', month, year],
    queryFn: () => getMonthlyAccountingSummary(parseInt(month), parseInt(year)),
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['accounting-periods'],
    queryFn: getAccountingPeriods,
  });

  const closeMutation = useMutation({
    mutationFn: (yr: number) => closeAccountingYear(yr, user!.id),
    onSuccess: () => {
      toast.success('Ejercicio cerrado correctamente');
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
    onError: (e: any) => toast.error(e.message || 'Error al cerrar ejercicio'),
  });

  const openMutation = useMutation({
    mutationFn: (yr: number) => openAccountingYear(yr, user!.id),
    onSuccess: () => {
      toast.success('Apertura generada correctamente');
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
    onError: (e: any) => toast.error(e.message || 'Error al generar apertura'),
  });

  const years = Array.from({ length: 5 }, (_, i) => (now.getFullYear() - 2 + i).toString());

  // Check if next year already has an opening entry (period exists)
  const hasOpeningForNext = (yr: number) => periods.some(p => p.year === yr + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent" /> Resumen Contable
        </h1>
        <p className="text-sm text-muted-foreground">Vista mensual del resultado contable interno</p>
      </div>

      <div className="flex gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Mes</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Año</label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" />Ventas (base)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{fmt(summary.ventasBase)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Receipt className="h-4 w-4" />IGIC repercutido</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{fmt(summary.igicRepercutido)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingDown className="h-4 w-4" />Gastos operativos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">{fmt(summary.gastosOperativos)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><BarChart3 className="h-4 w-4" />Resultado</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${summary.resultado >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(summary.resultado)}</p><p className="text-xs text-muted-foreground">Estimado (no oficial)</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><FileText className="h-4 w-4" />Asientos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{summary.numAsientos}</p></CardContent>
          </Card>
        </div>
      )}

      {/* Period management section - admin only */}
      {isAdmin && periods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Gestión de ejercicios</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asientos</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.year}</TableCell>
                    <TableCell>
                      {p.is_closed
                        ? <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" />Cerrado</Badge>
                        : <Badge variant="outline" className="gap-1"><Unlock className="h-3 w-3" />Abierto</Badge>
                      }
                    </TableCell>
                    <TableCell className="font-mono">{p.current_number}</TableCell>
                    <TableCell className="space-x-2">
                      {!p.is_closed && (
                        <Button size="sm" variant="destructive" onClick={() => setConfirmClose(p.year)} disabled={closeMutation.isPending}>
                          {closeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                          Cerrar ejercicio
                        </Button>
                      )}
                      {p.is_closed && !hasOpeningForNext(p.year) && (
                        <Button size="sm" variant="default" onClick={() => setConfirmOpen(p.year + 1)} disabled={openMutation.isPending}>
                          {openMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                          Generar apertura {p.year + 1}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Close confirmation */}
      <AlertDialog open={confirmClose !== null} onOpenChange={() => setConfirmClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar el ejercicio {confirmClose}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es <strong>irreversible</strong>. Se generará un asiento de cierre al 31/12/{confirmClose} y no se podrán registrar más operaciones contables en este ejercicio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmClose) { closeMutation.mutate(confirmClose); setConfirmClose(null); } }}>
              Confirmar cierre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Open confirmation */}
      <AlertDialog open={confirmOpen !== null} onOpenChange={() => setConfirmOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Generar apertura del ejercicio {confirmOpen}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará un asiento de apertura al 01/01/{confirmOpen} con los saldos patrimoniales del ejercicio anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmOpen) { openMutation.mutate(confirmOpen); setConfirmOpen(null); } }}>
              Generar apertura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
