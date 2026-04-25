import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/vehicles/StatusBadge';
import { formatCurrency, daysInStock } from '@/lib/constants';
import { Car } from 'lucide-react';
import type { Vehicle } from '@/lib/types';

interface Props {
  vehicles: Vehicle[];
  imageMap: Record<string, string>;
}

export function VehicleCatalogGrid({ vehicles, imageMap }: Props) {
  const navigate = useNavigate();

  if (vehicles.length === 0) {
    return (
      <Card className="border">
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Sin vehículos para mostrar.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {vehicles.map(v => {
        const imgUrl = imageMap[v.id];
        const dias = daysInStock(v.expo_date);
        return (
          <Card
            key={v.id}
            className="border shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
            onClick={() => navigate(`/vehicles/${v.id}`)}
          >
            {/* Image */}
            <div className="relative aspect-[4/3] bg-muted">
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={`${v.brand} ${v.model}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute top-2 left-2">
                <StatusBadge status={v.status} />
              </div>
            </div>

            {/* Info */}
            <CardContent className="p-3 space-y-1">
              <p className="font-semibold text-sm truncate">{v.brand} {v.model}</p>
              <p className="text-xs font-mono text-muted-foreground">{v.plate}</p>
              <p className="font-semibold text-sm">{formatCurrency(v.pvp_base)}</p>
              {dias > 0 && (
                <p className="text-xs text-muted-foreground">{dias} días en stock</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
