import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { getAccountChart, createManualJournalEntry } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Line {
  account_code: string;
  description: string;
  debit: number;
  credit: number;
}

export function ManualEntryDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const { data: accounts = [] } = useQuery({ queryKey: ['account-chart'], queryFn: getAccountChart });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { account_code: '', description: '', debit: 0, credit: 0 },
    { account_code: '', description: '', debit: 0, credit: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €';

  const updateLine = (i: number, field: keyof Line, value: any) => {
    const next = [...lines];
    next[i] = { ...next[i], [field]: value };
    setLines(next);
  };

  const addLine = () => setLines([...lines, { account_code: '', description: '', debit: 0, credit: 0 }]);
  const removeLine = (i: number) => { if (lines.length > 2) setLines(lines.filter((_, idx) => idx !== i)); };

  const handleSave = async () => {
    if (!description.trim()) { toast({ title: 'Descripción requerida', variant: 'destructive' }); return; }
    if (lines.some(l => !l.account_code)) { toast({ title: 'Todas las líneas necesitan cuenta', variant: 'destructive' }); return; }
    if (!balanced || totalDebit === 0) { toast({ title: 'El asiento debe cuadrar y ser > 0', variant: 'destructive' }); return; }

    setSaving(true);
    try {
      await createManualJournalEntry(
        { entry_date: new Date(date).toISOString(), description, lines: lines.map(l => ({ ...l, description: l.description || description })) },
        user!.id
      );
      toast({ title: 'Asiento de ajuste creado' });
      onSuccess();
      onClose();
      setDescription('');
      setLines([{ account_code: '', description: '', debit: 0, credit: 0 }, { account_code: '', description: '', debit: 0, credit: 0 }]);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Asiento de ajuste</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><Label>Descripción</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Motivo del ajuste..." /></div>
          </div>

          <div className="space-y-2">
            <Label>Líneas</Label>
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={line.account_code} onValueChange={v => updateLine(i, 'account_code', v)}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Cuenta" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.code} value={a.code}>{a.code} {a.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Concepto" className="flex-1" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                <Input type="number" step="0.01" min="0" placeholder="Debe" className="w-24" value={line.debit || ''} onChange={e => updateLine(i, 'debit', parseFloat(e.target.value) || 0)} />
                <Input type="number" step="0.01" min="0" placeholder="Haber" className="w-24" value={line.credit || ''} onChange={e => updateLine(i, 'credit', parseFloat(e.target.value) || 0)} />
                <Button variant="ghost" size="sm" onClick={() => removeLine(i)} disabled={lines.length <= 2}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Línea</Button>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-sm space-x-4">
              <span>Debe: <strong>{fmt(totalDebit)}</strong></span>
              <span>Haber: <strong>{fmt(totalCredit)}</strong></span>
              {!balanced && <span className="text-destructive font-medium">⚠ Descuadrado</span>}
              {balanced && totalDebit > 0 && <span className="text-green-600 font-medium">✓ Cuadrado</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !balanced || totalDebit === 0}>{saving ? 'Guardando...' : 'Crear asiento'}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
