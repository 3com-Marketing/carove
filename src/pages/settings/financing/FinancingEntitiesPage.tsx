import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getFinanceEntities, createFinanceEntity, updateFinanceEntity, deleteFinanceEntity,
  getFinanceProducts, getFinanceTermModels,
} from '@/lib/supabase-api';
import { EntityDialog } from '@/components/financing/EntityDialog';

export default function FinancingEntitiesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: entities = [], isLoading } = useQuery({ queryKey: ['finance-entities'], queryFn: getFinanceEntities });
  const { data: products = [] } = useQuery({ queryKey: ['finance-products'], queryFn: getFinanceProducts });
  const { data: termModels = [] } = useQuery({ queryKey: ['finance-term-models'], queryFn: getFinanceTermModels });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['finance-entities'] });
    qc.invalidateQueries({ queryKey: ['finance-products'] });
    qc.invalidateQueries({ queryKey: ['finance-term-models'] });
  };

  const handleSave = async (name: string) => {
    try {
      if (editing) {
        await updateFinanceEntity(editing.id, { name });
      } else {
        await createFinanceEntity(name);
      }
      invalidateAll();
      toast({ title: '✅ Entidad guardada' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
      throw e;
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await updateFinanceEntity(id, { active });
      invalidateAll();
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFinanceEntity(id);
      invalidateAll();
      toast({ title: '🗑️ Entidad eliminada' });
    } catch (e: any) {
      toast({ title: '❌ Error', description: e.message, variant: 'destructive' });
    }
  };

  const getProductCount = (entityId: string) => products.filter((p: any) => p.entity_id === entityId).length;
  const getModelCount = (entityId: string) => {
    const entityProductIds = products.filter((p: any) => p.entity_id === entityId).map((p: any) => p.id);
    return termModels.filter((m: any) => entityProductIds.includes(m.product_id)).length;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Financiación</span>
      </div>

      <h1 className="text-xl font-bold tracking-tight">Entidades Financieras</h1>

      <Card className="border shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Entidades</CardTitle>
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Nº Productos</TableHead>
                  <TableHead className="text-right">Nº Modelos</TableHead>
                  <TableHead className="w-20">Activo</TableHead>
                  <TableHead className="w-40">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{getProductCount(e.id)}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{getModelCount(e.id)}</TableCell>
                    <TableCell><Switch checked={e.active} onCheckedChange={v => handleToggle(e.id, v)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate(`/settings/financing/productos?entity_id=${e.id}`)}>
                          <Settings2 className="h-3 w-3 mr-1" /> Gestionar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => { setEditing(e); setDialogOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>¿Eliminar entidad?</AlertDialogTitle><AlertDialogDescription>No se podrá eliminar si tiene productos asociados.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(e.id)}>Eliminar</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {entities.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin entidades configuradas</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EntityDialog open={dialogOpen} onOpenChange={setDialogOpen} entity={editing} onSave={handleSave} />
    </div>
  );
}
