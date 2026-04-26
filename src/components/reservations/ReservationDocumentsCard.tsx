import { useQuery } from '@tanstack/react-query';
import { getReservationDocuments } from '@/lib/supabase-api';
import { RESERVATION_DOC_TYPE_LABELS } from '@/lib/types';
import type { ReservationDocumentType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, RotateCcw, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  reservationId: string;
  onViewDocument: (docType: string) => void;
  onGenerateDocument?: (docType: string) => void;
  loading?: boolean;
}

export function ReservationDocumentsCard({ reservationId, onViewDocument, onGenerateDocument, loading }: Props) {
  const { data: documents = [] } = useQuery({
    queryKey: ['reservation-documents', reservationId],
    queryFn: () => getReservationDocuments(reservationId),
  });

  const docsByType = documents.reduce((acc, doc) => {
    if (!acc[doc.document_type] || doc.version > acc[doc.document_type].version) {
      acc[doc.document_type] = doc;
    }
    return acc;
  }, {} as Record<string, typeof documents[0]>);

  const allTypes: ReservationDocumentType[] = ['reservation_document', 'deposit_receipt', 'sales_contract', 'proforma_invoice'];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {allTypes.map(type => {
          const doc = docsByType[type];
          const label = RESERVATION_DOC_TYPE_LABELS[type];
          const hasSnapshot = doc?.snapshot_json && Object.keys(doc.snapshot_json).length > 0;
          return (
            <div key={type} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium truncate">{label}</p>
                  {hasSnapshot && (
                    <span title="Datos congelados en snapshot">
                      <Lock className="h-3 w-3 text-primary shrink-0" />
                    </span>
                  )}
                </div>
                {doc ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {doc.document_number && (
                      <span className="text-[10px] font-mono text-primary">{doc.document_number}</span>
                    )}
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">v{doc.version}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {(() => {
                        if (!doc.generated_at) return '—';
                        const d = new Date(doc.generated_at);
                        return isNaN(d.getTime()) ? '—' : format(d, 'dd/MM/yyyy HH:mm', { locale: es });
                      })()}
                    </span>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No generado</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {doc ? (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onViewDocument(type)} disabled={loading} title="Ver documento">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {onGenerateDocument && (
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onGenerateDocument(type)} disabled={loading} title="Regenerar (nueva versión)">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                ) : onGenerateDocument ? (
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onGenerateDocument(type)} disabled={loading}>
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
