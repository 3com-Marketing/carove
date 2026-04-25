import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/hooks/useRole';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Pencil, Trash2, Car, TrendingUp, Landmark } from 'lucide-react';
import { TierDialog } from '@/components/incentives/TierDialog';
import { toast } from 'sonner';

const CATEGORIES = [
  { key: 'ventas', label: 'Ventas', icon: Car, unit: 'uds' },
  { key: 'margen', label: 'Margen', icon: TrendingUp, unit: '€' },
  { key: 'financiacion', label: 'Financiación', icon: Landmark, unit: 'uds' },
];

export default function IncentiveTiersPage() {
  const { isAdmin } = useRole();
  const [tab, setTab] = useState('ventas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  if (!isAdmin) return <Navigate to="/" replace />;

  const { data: tiers = [], refetch } = useQuery({
    queryKey: ['incentive-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incentive_tiers')
        .select('*')
        .order('threshold');
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('incentive_tiers').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Escalón eliminado');
      refetch();
    }
  };

  const handleEdit = (tier: any) => {
    setEditing(tier);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Escalones de Incentivos</h1>
          <p className="text-sm text-muted-foreground">Define los bonus por ventas, margen y financiación</p>
        </div>
        <Button onClick={handleNew}>
          <PlusCircle className="h-4 w-4 mr-2" /> Nuevo escalón
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat.key} value={cat.key} className="flex items-center gap-1">
              <cat.icon className="h-3 w-3" /> {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map(cat => (
          <TabsContent key={cat.key} value={cat.key} className="mt-4">
            <Card className="border shadow-sm">
              <CardContent className="pt-4">
                {tiers.filter((t: any) => t.category === cat.key).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No hay escalones configurados para {cat.label}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Umbral ({cat.unit})</TableHead>
                        <TableHead className="text-right">Bonus (€)</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tiers.filter((t: any) => t.category === cat.key).map((tier: any) => (
                        <TableRow key={tier.id}>
                          <TableCell className="font-medium">
                            {cat.unit === '€' ? `${tier.threshold.toLocaleString('es-ES')}€` : tier.threshold}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {tier.bonus_amount.toLocaleString('es-ES')}€
                          </TableCell>
                          <TableCell className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(tier)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(tier.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <TierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existing={editing}
        defaultCategory={tab}
        onSaved={refetch}
      />
    </div>
  );
}
