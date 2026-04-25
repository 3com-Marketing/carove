import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Tag } from 'lucide-react';
import { getCashCategories, updateCashCategory, getCategoryUsageCount } from '@/lib/supabase-api';
import type { CashCategory } from '@/lib/types';
import { CashCategoryDialog } from '@/components/treasury/CashCategoryDialog';
import { toast } from '@/hooks/use-toast';

export default function CashCategoriesPage() {
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CashCategory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCashCategories(undefined, false);
      setCategories(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (cat: CashCategory) => {
    try {
      if (cat.active) {
        const count = await getCategoryUsageCount(cat.id);
        if (count > 0) {
          toast({ title: 'Aviso', description: `Esta categoría tiene ${count} movimiento(s) asociado(s). Se desactivará pero no se eliminará.` });
        }
      }
      await updateCashCategory(cat.id, { active: !cat.active });
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const ingresos = categories.filter(c => c.category_type === 'ingreso');
  const gastos = categories.filter(c => c.category_type === 'gasto');

  const renderTable = (items: CashCategory[], title: string) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" />
          {title}
          <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-20 text-center">Orden</TableHead>
              <TableHead className="w-24 text-center">Estado</TableHead>
              <TableHead className="w-20 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin categorías</TableCell></TableRow>
            ) : items.map(c => (
              <TableRow key={c.id} className={!c.active ? 'opacity-50' : ''}>
                <TableCell className="font-medium text-sm">{c.name}</TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{c.sort_order}</TableCell>
                <TableCell className="text-center">
                  <Switch checked={c.active} onCheckedChange={() => handleToggle(c)} />
                </TableCell>
                <TableCell className="text-center">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(c); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías de Caja</h1>
          <p className="text-sm text-muted-foreground">Gestiona las categorías de ingresos y gastos para los movimientos de caja</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nueva categoría
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderTable(ingresos, 'Categorías de Ingreso')}
          {renderTable(gastos, 'Categorías de Gasto')}
        </div>
      )}

      <CashCategoryDialog
        open={dialogOpen}
        category={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onSuccess={load}
      />
    </div>
  );
}
