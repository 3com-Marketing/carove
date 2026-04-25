import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ExcelImporterProps {
  onImport: (rows: any[]) => Promise<{ created: number; updated: number; errors: string[] }>;
}

export function ExcelImporter({ onImport }: ExcelImporterProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('El archivo debe tener al menos una fila de datos');

      const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
      const requiredCols = ['entidad', 'producto', 'tin', 'plazo_meses', 'coefficient', 'additional_rate', 'active'];
      const missing = requiredCols.filter(c => !headers.includes(c));
      if (missing.length > 0) throw new Error(`Columnas faltantes: ${missing.join(', ')}`);

      const rows = lines.slice(1).map((line, idx) => {
        const cols = line.split(/[,;\t]/).map(c => c.trim());
        const row: any = {};
        headers.forEach((h, i) => { row[h] = cols[i] || ''; });
        row._lineNumber = idx + 2;
        return row;
      }).filter(r => r.entidad && r.producto);

      const res = await onImport(rows);
      setResult(res);
    } catch (err: any) {
      setResult({ created: 0, updated: 0, errors: [err.message] });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFile} className="hidden" />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
          {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Importar CSV
        </Button>
        <span className="text-xs text-muted-foreground">Columnas: Entidad | Producto | TIN | Plazo_meses | Coefficient | Additional_rate | Active | Comision (opcional)</span>
      </div>

      {result && (
        <Alert className={result.errors.length > 0 ? 'border-destructive/50' : 'border-primary/50'}>
          <AlertDescription className="text-sm space-y-1">
            {result.created > 0 && <p className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {result.created} creados</p>}
            {result.updated > 0 && <p className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {result.updated} actualizados</p>}
            {result.errors.map((err, i) => (
              <p key={i} className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> {err}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
