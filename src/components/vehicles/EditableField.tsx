import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, XCircle } from 'lucide-react';

interface EditableFieldProps {
  label: string;
  value: React.ReactNode;
  editing?: boolean;
  type?: 'text' | 'number' | 'date' | 'select' | 'boolean';
  editValue?: string | number | boolean;
  onChange?: (value: string | boolean) => void;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export function EditableField({ label, value, editing, type = 'text', editValue, onChange, options, placeholder }: EditableFieldProps) {
  const check = (ok: boolean) => ok ? <CheckCircle className="h-4 w-4 text-status-disponible" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />;

  return (
    <div className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {editing && onChange ? (
        <div className="w-1/2">
          {type === 'select' && options ? (
            <Select value={String(editValue || '') || undefined} onValueChange={v => onChange(v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          ) : type === 'boolean' ? (
            <div className="flex items-center justify-end gap-2">
              <Checkbox checked={!!editValue} onCheckedChange={v => onChange(!!v)} />
              <span className="text-xs">{editValue ? 'Sí' : 'No'}</span>
            </div>
          ) : (
            <Input
              type={type}
              value={editValue !== undefined && editValue !== null ? String(editValue) : ''}
              onChange={e => onChange(e.target.value)}
              className="h-8 text-xs"
              placeholder={placeholder}
            />
          )}
        </div>
      ) : (
        <span className="text-sm font-medium text-right">{value}</span>
      )}
    </div>
  );
}
