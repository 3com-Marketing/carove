import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVehicles, getExpenses, getSuppliers, getAuditLogs } from '@/lib/supabase-api';
import { useRole } from '@/hooks/useRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, CheckCircle, Database, Loader2, ScrollText } from 'lucide-react';

const routes = [
  { path: '/', name: 'Dashboard' },
  { path: '/vehicles', name: 'Stock de Vehículos' },
  { path: '/vehicles/new', name: 'Nuevo Vehículo' },
  { path: '/sales', name: 'Ventas' },
  { path: '/history', name: 'Histórico' },
  { path: '/masters/suppliers', name: 'Talleres / Acreedores' },
  { path: '/masters/insurers', name: 'Aseguradoras' },
  { path: '/masters/users', name: 'Usuarios' },
  { path: '/status', name: 'Estado del Sistema' },
];

const ACTION_LABELS: Record<string, string> = { INSERT: 'Crear', UPDATE: 'Editar', DELETE: 'Eliminar' };
const ENTITY_LABELS: Record<string, string> = {
  vehiculo: 'Vehículo', gasto: 'Gasto', documento: 'Documento', factura: 'Factura',
  cobro: 'Cobro', cliente: 'Cliente', reserva: 'Reserva', nota: 'Nota',
  postventa: 'Postventa', propuesta: 'Propuesta', venta: 'Venta',
};

export default function StatusPage() {
  const { has } = useRole();
  const { data: vehicles = [], isLoading: lv } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles });
  const { data: expenses = [], isLoading: le } = useQuery({ queryKey: ['expenses'], queryFn: () => getExpenses() });
  const { data: suppliers = [], isLoading: ls } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const { data: auditLogs = [], isLoading: la } = useQuery({ queryKey: ['audit_logs'], queryFn: () => getAuditLogs(50), enabled: has('view:audit') });

  const [entityFilter, setEntityFilter] = useState<string>('all');

  const filteredLogs = entityFilter === 'all' ? auditLogs : auditLogs.filter(l => l.entity_type === entityFilter);

  if (lv || le || ls) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div><h1 className="text-2xl font-bold tracking-tight">Estado del Sistema</h1><p className="text-sm text-muted-foreground">Health-check y estadísticas</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ count: vehicles.length, label: 'Vehículos' }, { count: expenses.length, label: 'Gastos' }, { count: suppliers.length, label: 'Proveedores' }].map(s => (
          <Card key={s.label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Database className="h-5 w-5 text-accent" />
              <div><p className="text-2xl font-bold">{s.count}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border shadow-sm">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Rutas del sistema</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Ruta</TableHead><TableHead>Página</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
            <TableBody>
              {routes.map(r => (
                <TableRow key={r.path}>
                  <TableCell className="font-mono text-xs">{r.path}</TableCell>
                  <TableCell className="text-sm">{r.name}</TableCell>
                  <TableCell><Badge variant="default" className="bg-status-disponible text-white"><CheckCircle className="h-3 w-3 mr-1" /> OK</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {has('view:audit') && (
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2"><ScrollText className="h-4 w-4" /> Log de Auditoría (últimos 50)</CardTitle>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Filtrar entidad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las entidades</SelectItem>
                  {Object.entries(ENTITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {la ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin registros de auditoría.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Resumen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString('es-ES')}</TableCell>
                      <TableCell className="text-xs">{log.actor_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={log.action === 'DELETE' ? 'destructive' : log.action === 'INSERT' ? 'default' : 'outline'} className="text-[10px]">
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.entity_type && <Badge variant="outline" className="text-[10px] capitalize">{ENTITY_LABELS[log.entity_type] || log.entity_type}</Badge>}
                      </TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{log.summary || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">Carove Gestión v2.0 · Modo: Lovable Cloud · Build: {new Date().toLocaleDateString('es-ES')}</p>
    </div>
  );
}
