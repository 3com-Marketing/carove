import { useState, useRef } from 'react';
import { InsuranceSection } from './InsuranceSection';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDocuments, uploadDocument, deleteDocument, updateDocument, getSmartDocumentsForVehicle } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, FileText, Image, Eye, Loader2, Printer, Pencil, Sparkles, Download, ExternalLink } from 'lucide-react';
import type { VehicleDocument } from '@/lib/types';

const CATEGORIES = [
  { value: 'ficha_tecnica', label: 'Ficha Técnica' },
  { value: 'permiso_circulacion', label: 'Permiso de Circulación' },
  { value: 'contrato_compra', label: 'Contrato de Compra' },
  { value: 'contrato_venta', label: 'Contrato de Venta' },
  { value: 'itv', label: 'ITV' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'factura_compra', label: 'Factura de Compra' },
  { value: 'foto', label: 'Foto' },
  { value: 'otro', label: 'Otro' },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategoryLabel(value: string) {
  return CATEGORIES.find(c => c.value === value)?.label || value;
}

interface UnifiedDoc {
  id: string;
  filename: string;
  category: string;
  file_size: number;
  uploaded_by_name: string;
  created_at: string;
  file_url: string;
  mime_type: string | null;
  source: 'manual' | 'ai';
  original?: VehicleDocument;
}

export function DocumentsTab({ vehicleId }: { vehicleId: string }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const [category, setCategory] = useState('otro');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  const [editDoc, setEditDoc] = useState<VehicleDocument | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', vehicleId],
    queryFn: () => getDocuments(vehicleId),
  });

  const { data: smartDocs = [] } = useQuery({
    queryKey: ['smart-documents-vehicle', vehicleId],
    queryFn: () => getSmartDocumentsForVehicle(vehicleId),
  });

  const unifiedDocs: UnifiedDoc[] = [
    ...documents.map((doc): UnifiedDoc => ({
      id: doc.id,
      filename: doc.filename,
      category: doc.category,
      file_size: doc.file_size,
      uploaded_by_name: doc.uploaded_by_name,
      created_at: doc.created_at,
      file_url: doc.file_url,
      mime_type: doc.mime_type,
      source: 'manual',
      original: doc,
    })),
    ...smartDocs.map((sd: any): UnifiedDoc => ({
      id: sd.id,
      filename: sd.file_name,
      category: sd.document_type || 'otro',
      file_size: sd.file_size || 0,
      uploaded_by_name: sd.uploaded_by_name || '',
      created_at: sd.created_at,
      file_url: sd._signed_url || '',
      mime_type: 'application/pdf',
      source: 'ai',
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(file, vehicleId, category, user.id, profile?.full_name || user.email || '');
      }
      qc.invalidateQueries({ queryKey: ['documents', vehicleId] });
      toast({ title: `✅ ${files.length} documento(s) subido(s)` });
    } catch (err: any) {
      toast({ title: '❌ Error al subir', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string, fileUrl: string) => {
    try {
      await deleteDocument(docId, fileUrl);
      qc.invalidateQueries({ queryKey: ['documents', vehicleId] });
      toast({ title: '🗑️ Documento eliminado' });
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    }
  };

  const handlePrint = (fileUrl: string) => {
    const printWindow = window.open(fileUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => { printWindow.print(); });
    }
  };

  const handleDownload = (fileUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = filename;
    a.target = '_blank';
    a.click();
  };

  const handleOpen = (fileUrl: string) => {
    if (fileUrl) window.open(fileUrl, '_blank');
  };

  const openEditDialog = (doc: VehicleDocument) => {
    setEditDoc(doc);
    setEditName(doc.filename);
    setEditCategory(doc.category);
  };

  const handleEditSave = async () => {
    if (!editDoc) return;
    setEditSaving(true);
    try {
      await updateDocument(editDoc.id, { filename: editName.trim(), category: editCategory });
      qc.invalidateQueries({ queryKey: ['documents', vehicleId] });
      toast({ title: '✅ Documento actualizado' });
      setEditDoc(null);
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const isImage = (mime: string | null) => mime?.startsWith('image/');
  const isPdf = (mime: string | null) => mime === 'application/pdf';

  const renderDocActions = (doc: UnifiedDoc, mobile: boolean) => {
    const btnClass = mobile
      ? 'h-9 w-9 touch-manipulation'
      : 'h-6 w-6';
    const iconClass = mobile ? 'h-4 w-4' : 'h-3 w-3';

    return (
      <div className={`flex ${mobile ? 'flex-wrap gap-2' : 'gap-1'}`}>
        {doc.file_url && (
          <Button variant="ghost" size="icon" className={btnClass} title="Abrir en nueva pestaña" onClick={() => handleOpen(doc.file_url)}>
            <ExternalLink className={iconClass} />
          </Button>
        )}
        {doc.file_url && (isImage(doc.mime_type) || isPdf(doc.mime_type)) && (
          <>
            <Button variant="ghost" size="icon" className={btnClass} title="Previsualizar" onClick={() => { setPreviewUrl(doc.file_url); setPreviewName(doc.filename); }}>
              <Eye className={iconClass} />
            </Button>
            <Button variant="ghost" size="icon" className={btnClass} title="Imprimir" onClick={() => handlePrint(doc.file_url)}>
              <Printer className={iconClass} />
            </Button>
          </>
        )}
        {doc.file_url && (
          <Button variant="ghost" size="icon" className={btnClass} title="Descargar" onClick={() => handleDownload(doc.file_url, doc.filename)}>
            <Download className={iconClass} />
          </Button>
        )}
        {doc.source === 'manual' && doc.original && (
          <>
            <Button variant="ghost" size="icon" className={btnClass} title="Editar" onClick={() => openEditDialog(doc.original!)}>
              <Pencil className={iconClass} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className={`${btnClass} text-destructive`} title="Eliminar"><Trash2 className={iconClass} /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle><AlertDialogDescription>Se eliminará «{doc.filename}» permanentemente.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(doc.id, doc.original!.file_url)}>Eliminar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    );
  };

  const renderMobileCards = () => (
    <div className="space-y-3">
      {unifiedDocs.map(doc => (
        <div key={`${doc.source}-${doc.id}`} className="border rounded-lg p-3 space-y-2 bg-card">
          {/* Row 1: icon + filename + AI badge */}
          <div className="flex items-start gap-2">
            {isImage(doc.mime_type) ? <Image className="h-4 w-4 text-accent mt-0.5 shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
            <button
              className="text-sm font-medium text-left truncate hover:underline text-primary"
              onClick={() => handleOpen(doc.file_url)}
            >
              {doc.filename}
            </button>
            {doc.source === 'ai' && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5 shrink-0">
                <Sparkles className="h-2.5 w-2.5" /> IA
              </Badge>
            )}
          </div>
          {/* Row 2: category, size, date */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] capitalize">{getCategoryLabel(doc.category)}</Badge>
            <span>{formatFileSize(doc.file_size)}</span>
            <span>·</span>
            <span>{new Date(doc.created_at).toLocaleDateString('es-ES')}</span>
          </div>
          {/* Row 3: actions */}
          {renderDocActions(doc, true)}
        </div>
      ))}
    </div>
  );

  const renderDesktopTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead></TableHead>
          <TableHead>Archivo</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Tamaño</TableHead>
          <TableHead>Subido por</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="w-40"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {unifiedDocs.map(doc => (
          <TableRow key={`${doc.source}-${doc.id}`}>
            <TableCell>
              {isImage(doc.mime_type) ? <Image className="h-4 w-4 text-accent" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
            </TableCell>
            <TableCell className="text-xs font-medium max-w-[200px] truncate">
              <div className="flex items-center gap-1.5">
                <button className="hover:underline text-left truncate text-primary" onClick={() => handleOpen(doc.file_url)}>
                  {doc.filename}
                </button>
                {doc.source === 'ai' && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                    <Sparkles className="h-2.5 w-2.5" /> IA
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[10px] capitalize">{getCategoryLabel(doc.category)}</Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</TableCell>
            <TableCell className="text-xs">{doc.uploaded_by_name}</TableCell>
            <TableCell className="text-xs">{new Date(doc.created_at).toLocaleDateString('es-ES')}</TableCell>
            <TableCell>{renderDocActions(doc, false)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
      {/* Insurance Section */}
      <InsuranceSection vehicleId={vehicleId} />

      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} gap-2`}>
            <CardTitle className="text-sm">📎 Documentación del Vehículo</CardTitle>
            <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-2`}>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={`h-8 text-xs ${isMobile ? 'w-full' : 'w-[160px]'}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()} className={isMobile ? 'w-full' : ''}>
                {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                Subir
              </Button>
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : unifiedDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin documentos. Sube fichas técnicas, permisos, facturas o fotos.</p>
          ) : isMobile ? renderMobileCards() : renderDesktopTable()}
        </CardContent>
      </Card>

      {/* Edit document dialog */}
      <Dialog open={!!editDoc} onOpenChange={v => !v && setEditDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Editar documento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nombre del archivo</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Categoría</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoc(null)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={editSaving || !editName.trim()}>
              {editSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview panel */}
      <Sheet open={!!previewUrl} onOpenChange={v => !v && setPreviewUrl(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader><SheetTitle className="text-sm truncate">{previewName}</SheetTitle></SheetHeader>
          <div className="mt-4 h-[calc(100vh-8rem)]">
            {previewUrl && (
              previewUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)
                ? <img src={previewUrl} alt={previewName} className="w-full h-full object-contain rounded-lg" />
                : <iframe src={previewUrl} className="w-full h-full rounded-lg border" title={previewName} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
