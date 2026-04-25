import { Badge } from '@/components/ui/badge';
import { RotateCcw, Upload } from 'lucide-react';

export function View360Placeholder() {
  return (
    <div className="space-y-6">
      <div className="relative rounded-xl border-2 border-dashed border-muted-foreground/20 p-12 flex flex-col items-center gap-4 opacity-50 pointer-events-none">
        <Badge variant="secondary" className="absolute -top-3 right-4 text-xs font-semibold tracking-wide">
          Próximamente
        </Badge>
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <RotateCcw className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Vista 360° del vehículo</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Sube múltiples fotos del vehículo desde distintos ángulos y genera automáticamente
          una vista interactiva 360° para mostrar a tus clientes.
        </p>
        <div className="flex items-center gap-2 mt-4 px-6 py-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Arrastra aquí 12-36 fotos del vehículo</span>
        </div>
      </div>
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">¿Cómo funcionará?</h4>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Sube entre 12 y 36 fotos del vehículo tomadas en intervalos regulares alrededor del coche</li>
          <li>El sistema generará automáticamente la vista 360° interactiva</li>
          <li>Podrás integrar el visor en tu web o compartir un enlace con el cliente</li>
          <li>Compatible con publicación en portales como Coches.net, Wallapop, etc.</li>
        </ul>
      </div>
    </div>
  );
}
