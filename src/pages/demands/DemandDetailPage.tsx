import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDemandById } from '@/lib/supabase-api';
import { DemandDetail } from '@/components/demands/DemandDetail';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function DemandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: demand, isLoading, refetch } = useQuery({
    queryKey: ['demand', id],
    queryFn: () => getDemandById(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  if (!demand) return <div className="p-8 text-center text-muted-foreground">Demanda no encontrada</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>
      <DemandDetail demand={demand} onRefresh={() => refetch()} />
    </div>
  );
}
