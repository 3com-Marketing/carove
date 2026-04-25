import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Printer, Mail, Trash2, FileText, Download, Loader2 } from 'lucide-react';

export interface DocumentAction {
  icon: 'eye' | 'printer' | 'mail' | 'trash' | 'pdf' | 'download';
  tooltip: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  html: string;
  actions?: DocumentAction[];
  /** If provided, loads a URL in the iframe instead of srcDoc */
  src?: string;
}

const iconMap = {
  eye: Eye,
  printer: Printer,
  mail: Mail,
  trash: Trash2,
  pdf: FileText,
  download: Download,
};

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  html,
  actions = [],
  src,
}: DocumentPreviewDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const visibleActions = actions.filter(a => !a.hidden);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-sm font-semibold truncate">{title}</DialogTitle>
              <DialogDescription className="sr-only">Vista previa del documento</DialogDescription>
            </div>
            {visibleActions.length > 0 && (
              <TooltipProvider delayDuration={200}>
                <div className="flex items-center gap-1">
                  {visibleActions.map((action, i) => {
                    const Icon = iconMap[action.icon];
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={action.onClick}
                            disabled={action.disabled || action.loading}
                          >
                            {action.loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Icon className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">{action.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <iframe
            ref={iframeRef}
            {...(src ? { src } : { srcDoc: html })}
            className="w-full h-full border-0 bg-white"
            title={title}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Helper to trigger print on the iframe */
export function printIframe(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  try {
    iframeRef.current?.contentWindow?.print();
  } catch {
    // cross-origin fallback
    window.print();
  }
}
