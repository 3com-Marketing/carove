import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Type, Image as ImageIcon, MousePointerClick, Minus, LayoutTemplate,
  GripVertical, Trash2, ArrowUp, ArrowDown, Save, CheckCircle, Eye, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type EmailBlock =
  | { type: 'header'; logoUrl: string }
  | { type: 'text'; content: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'cta'; text: string; url: string; color: string }
  | { type: 'separator' }
  | { type: 'footer'; text: string };

const DEFAULT_BLOCKS: EmailBlock[] = [
  { type: 'header', logoUrl: '' },
  { type: 'text', content: 'Escribe tu contenido aquí...' },
  { type: 'cta', text: 'Ver más', url: '#', color: '#3b82f6' },
  { type: 'footer', text: '© 2025 Carove. Todos los derechos reservados.' },
];

const BLOCK_TYPES = [
  { type: 'text', label: 'Texto', icon: Type },
  { type: 'image', label: 'Imagen', icon: ImageIcon },
  { type: 'cta', label: 'Botón CTA', icon: MousePointerClick },
  { type: 'separator', label: 'Separador', icon: Minus },
];

interface Props {
  open: boolean;
  campaign?: any;
  lists: any[];
  onOpenChange: (open: boolean) => void;
}

export function EmailCampaignEditor({ open, campaign, lists, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [listId, setListId] = useState<string>('');
  const [blocks, setBlocks] = useState<EmailBlock[]>(DEFAULT_BLOCKS);
  const [showPreview, setShowPreview] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWithAI = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-email-content', {
        body: { campaignName: name, context: aiContext },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (data.subject) setSubject(data.subject);
      if (data.previewText) setPreviewText(data.previewText);
      if (Array.isArray(data.blocks) && data.blocks.length > 0) setBlocks(data.blocks);
      toast.success('Contenido generado con IA');
    } catch (e: any) {
      toast.error(e.message || 'Error al generar contenido');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (campaign) {
        setName(campaign.name || '');
        setSubject(campaign.subject || '');
        setPreviewText(campaign.preview_text || '');
        setListId(campaign.list_id || '');
        try {
          const parsed = typeof campaign.body_json === 'string' ? JSON.parse(campaign.body_json) : campaign.body_json;
          setBlocks(Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BLOCKS);
        } catch { setBlocks(DEFAULT_BLOCKS); }
      } else {
        setName(''); setSubject(''); setPreviewText(''); setListId('');
        setBlocks(DEFAULT_BLOCKS);
      }
      setShowPreview(false);
    }
  }, [open, campaign]);

  const updateBlock = useCallback((idx: number, updates: Partial<EmailBlock>) => {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, ...updates } as EmailBlock : b));
  }, []);

  const removeBlock = (idx: number) => setBlocks(prev => prev.filter((_, i) => i !== idx));
  const moveBlock = (idx: number, dir: -1 | 1) => {
    setBlocks(prev => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const addBlock = (type: string) => {
    const newBlock: EmailBlock = type === 'text' ? { type: 'text', content: '' }
      : type === 'image' ? { type: 'image', url: '', alt: '' }
      : type === 'cta' ? { type: 'cta', text: 'Click aquí', url: '#', color: '#3b82f6' }
      : { type: 'separator' };
    // Insert before footer if there is one
    setBlocks(prev => {
      const footerIdx = prev.findIndex(b => b.type === 'footer');
      if (footerIdx >= 0) {
        const arr = [...prev];
        arr.splice(footerIdx, 0, newBlock);
        return arr;
      }
      return [...prev, newBlock];
    });
  };

  const generateHtml = (): string => {
    const renderBlock = (b: EmailBlock) => {
      switch (b.type) {
        case 'header':
          return `<tr><td style="padding:24px;text-align:center;background:#1a1a2e"><img src="${b.logoUrl || 'https://via.placeholder.com/120x40?text=Logo'}" alt="Logo" style="max-height:40px"/></td></tr>`;
        case 'text':
          return `<tr><td style="padding:20px 24px;font-size:15px;line-height:1.6;color:#333">${b.content.replace(/\n/g, '<br/>')}</td></tr>`;
        case 'image':
          return b.url ? `<tr><td style="padding:12px 24px"><img src="${b.url}" alt="${b.alt}" style="width:100%;border-radius:8px"/></td></tr>` : '';
        case 'cta':
          return `<tr><td style="padding:20px 24px;text-align:center"><a href="${b.url}" style="display:inline-block;padding:12px 32px;background:${b.color};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">${b.text}</a></td></tr>`;
        case 'separator':
          return `<tr><td style="padding:8px 24px"><hr style="border:none;border-top:1px solid #e5e5e5"/></td></tr>`;
        case 'footer':
          return `<tr><td style="padding:16px 24px;text-align:center;font-size:11px;color:#999;background:#f9f9f9">${b.text}</td></tr>`;
      }
    };
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5"><tr><td align="center" style="padding:24px 0"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">${blocks.map(renderBlock).join('')}</table></td></tr></table></body></html>`;
  };

  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      const payload = {
        name, subject, preview_text: previewText, list_id: listId || null,
        body_json: blocks, body_html: generateHtml(), status, user_id: user!.id,
      };
      if (campaign) {
        const { error } = await supabase.from('email_campaigns').update(payload).eq('id', campaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_campaigns').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campaña guardada');
      onOpenChange(false);
    },
    onError: () => toast.error('Error al guardar'),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{campaign ? 'Editar Campaña' : 'Nueva Campaña de Email'}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {!showPreview ? (
            <div className="space-y-5">
              {/* Meta fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Nombre de la campaña</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Newsletter Marzo" /></div>
                <div><Label>Asunto</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto del email" /></div>
                <div><Label>Lista destino</Label>
                  <Select value={listId} onValueChange={setListId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar lista" /></SelectTrigger>
                    <SelectContent>{lists.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Texto de preview</Label><Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Texto que aparece en la bandeja de entrada" /></div>
              </div>

              {/* AI Generation */}
              <div className="border border-dashed border-primary/30 rounded-lg p-3 bg-primary/5">
                <Label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />Generar con IA
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    placeholder="Ej: Promoción verano SUVs, Nuevas llegadas BMW..."
                    className="flex-1 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateWithAI}
                    disabled={isGenerating}
                    className="shrink-0"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                    {isGenerating ? 'Generando...' : 'Simular'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Rellena asunto, preview y bloques automáticamente</p>
              </div>

              <Separator />

              {/* Block editor */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Contenido del email</Label>
                  <div className="flex gap-1">
                    {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
                      <Button key={type} variant="outline" size="sm" onClick={() => addBlock(type)} title={label}>
                        <Icon className="h-3.5 w-3.5" />
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {blocks.map((block, idx) => (
                    <div key={idx} className="flex gap-2 items-start border rounded-lg p-3 bg-muted/20">
                      <div className="flex flex-col gap-0.5 pt-1">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveBlock(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                        <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveBlock(idx, 1)} disabled={idx === blocks.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <BlockEditor block={block} onChange={(updates) => updateBlock(idx, updates)} />
                      </div>
                      {block.type !== 'header' && block.type !== 'footer' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeBlock(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="border rounded-lg overflow-hidden shadow-lg" style={{ width: 360 }}>
                <iframe
                  srcDoc={generateHtml()}
                  className="w-full border-0"
                  style={{ height: 600 }}
                  title="Email Preview"
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-6 py-3 flex items-center justify-between bg-background">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-1" />{showPreview ? 'Editor' : 'Preview'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => saveMutation.mutate('draft')} disabled={!name.trim() || saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />Borrador
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate('ready')} disabled={!name.trim() || saveMutation.isPending}>
              <CheckCircle className="h-4 w-4 mr-1" />Marcar lista
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BlockEditor({ block, onChange }: { block: EmailBlock; onChange: (u: Partial<EmailBlock>) => void }) {
  switch (block.type) {
    case 'header':
      return (
        <div>
          <Badge variant="outline" className="mb-1">Header</Badge>
          <Input value={block.logoUrl} onChange={(e) => onChange({ logoUrl: e.target.value })} placeholder="URL del logo (opcional)" className="text-xs h-8" />
        </div>
      );
    case 'text':
      return (
        <div>
          <Badge variant="outline" className="mb-1">Texto</Badge>
          <Textarea value={block.content} onChange={(e) => onChange({ content: e.target.value })} rows={3} placeholder="Escribe tu texto..." className="text-sm" />
        </div>
      );
    case 'image':
      return (
        <div>
          <Badge variant="outline" className="mb-1">Imagen</Badge>
          <Input value={block.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="URL de la imagen" className="text-xs h-8 mb-1" />
          <Input value={block.alt} onChange={(e) => onChange({ alt: e.target.value })} placeholder="Texto alternativo" className="text-xs h-8" />
        </div>
      );
    case 'cta':
      return (
        <div>
          <Badge variant="outline" className="mb-1">Botón CTA</Badge>
          <div className="grid grid-cols-3 gap-1">
            <Input value={block.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Texto" className="text-xs h-8" />
            <Input value={block.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="URL destino" className="text-xs h-8" />
            <Input type="color" value={block.color} onChange={(e) => onChange({ color: e.target.value })} className="h-8 w-full p-1" />
          </div>
        </div>
      );
    case 'separator':
      return <Badge variant="outline">Separador</Badge>;
    case 'footer':
      return (
        <div>
          <Badge variant="outline" className="mb-1">Footer</Badge>
          <Input value={block.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="Texto del footer" className="text-xs h-8" />
        </div>
      );
  }
}
