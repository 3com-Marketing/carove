import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';

interface TransferRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (destinationBranch: string, observations: string) => Promise<void>;
  currentBranch: string;
  saving?: boolean;
}

export function TransferRequestDialog({ open, onClose, onSubmit, currentBranch, saving }: TransferRequestDialogProps) {
  const [destination, setDestination] = useState('');
  const [observations, setObservations] = useState('');

  const { data: allBranches = [] } = useBranches();
  const availableBranches = allBranches.filter(c => c !== currentBranch);

  const handleSubmit = async () => {
    if (!destination) return;
    await onSubmit(destination, observations);
    setDestination('');
    setObservations('');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Traspaso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Sucursal origen</Label>
            <p className="text-sm font-medium mt-1">{currentBranch}</p>
          </div>
          <div>
            <Label>Sucursal destino</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar destino" />
              </SelectTrigger>
              <SelectContent>
                {availableBranches.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observaciones (opcional)</Label>
            <Textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Motivo del traspaso..."
              className="mt-1 min-h-[60px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!destination || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Solicitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
