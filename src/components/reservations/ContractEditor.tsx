import { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Printer, Download, X, Loader2, Check, CloudOff,
} from 'lucide-react';
import { updateDocumentHtmlContent } from '@/lib/supabase-api';
import { cn } from '@/lib/utils';

interface ContractEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  html: string;
  documentId: string;
  version: number;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'idle';

export function ContractEditor({
  open,
  onOpenChange,
  title,
  html,
  documentId,
  version,
}: ContractEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtmlRef = useRef<string>(html);

  const saveContent = useCallback(async () => {
    if (!iframeRef.current?.contentDocument?.body) return;
    const currentHtml = iframeRef.current.contentDocument.documentElement.outerHTML;
    setSaveStatus('saving');
    try {
      await updateDocumentHtmlContent(documentId, currentHtml);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 2000);
    } catch {
      setSaveStatus('unsaved');
    }
  }, [documentId]);

  const handleInput = useCallback(() => {
    setSaveStatus('unsaved');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveContent(), 2000);
  }, [saveContent]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onIframeLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.designMode = 'on';
    doc.addEventListener('input', handleInput);
  }, [handleInput]);

  const execCommand = (cmd: string, value?: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.execCommand(cmd, false, value);
    doc.body.focus();
  };

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.print();
    } catch {
      window.print();
    }
  };

  const handleDownload = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const content = doc.documentElement.outerHTML;
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toolbarButtons = [
    { icon: Bold, cmd: 'bold', label: 'Negrita' },
    { icon: Italic, cmd: 'italic', label: 'Cursiva' },
    { icon: Underline, cmd: 'underline', label: 'Subrayado' },
    { type: 'separator' as const },
    { icon: AlignLeft, cmd: 'justifyLeft', label: 'Alinear izquierda' },
    { icon: AlignCenter, cmd: 'justifyCenter', label: 'Centrar' },
    { icon: AlignRight, cmd: 'justifyRight', label: 'Alinear derecha' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">{title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">v{version}</Badge>
                <span className="text-[10px] text-muted-foreground">Editable</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save status */}
            <div className={cn(
              'flex items-center gap-1 text-[11px] px-2 py-1 rounded-full transition-colors',
              saveStatus === 'saved' && 'text-emerald-600 bg-emerald-50',
              saveStatus === 'saving' && 'text-amber-600 bg-amber-50',
              saveStatus === 'unsaved' && 'text-destructive bg-destructive/10',
              saveStatus === 'idle' && 'text-muted-foreground',
            )}>
              {saveStatus === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Guardando...</>}
              {saveStatus === 'saved' && <><Check className="h-3 w-3" /> Guardado</>}
              {saveStatus === 'unsaved' && <><CloudOff className="h-3 w-3" /> Sin guardar</>}
            </div>

            {/* Toolbar */}
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-0.5 border rounded-md px-1 py-0.5 bg-background">
                {toolbarButtons.map((btn, i) => {
                  if ('type' in btn && btn.type === 'separator') {
                    return <div key={i} className="w-px h-5 bg-border mx-0.5" />;
                  }
                  const Icon = btn.icon!;
                  return (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onMouseDown={(e) => { e.preventDefault(); execCommand(btn.cmd!); }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom"><p className="text-xs">{btn.label}</p></TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              <div className="w-px h-5 bg-border mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">Imprimir</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">Descargar HTML</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 min-h-0 bg-muted/20">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            onLoad={onIframeLoad}
            className="w-full h-full border-0 bg-white mx-auto"
            style={{ maxWidth: '900px', display: 'block', margin: '0 auto' }}
            title={title}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
