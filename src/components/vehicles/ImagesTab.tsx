import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getVehicleImages, uploadVehicleImage, deleteVehicleImage, updateVehicleImageOrder, setVehicleImagePrimary } from '@/lib/supabase-api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ImagePlus, Star, Trash2, Loader2, GripVertical, ZoomIn, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleImageEnhanceDialog } from './VehicleImageEnhanceDialog';

interface VehicleImage {
  id: string;
  vehicle_id: string;
  original_url: string;
  thumbnail_url: string | null;
  is_primary: boolean;
  order_index: number;
  alt_text: string;
  is_public: boolean;
  uploaded_by: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

const MAX_IMAGES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function SortableImageCard({ image, onDelete, onSetPrimary, onPreview, onEnhance }: {
  image: VehicleImage;
  onDelete: (img: VehicleImage) => void;
  onSetPrimary: (img: VehicleImage) => void;
  onPreview: (img: VehicleImage) => void;
  onEnhance: (img: VehicleImage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const imgSrc = image.thumbnail_url || image.original_url;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden",
        isDragging && "opacity-50 z-50 shadow-lg",
        image.is_primary && "ring-2 ring-primary"
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 p-1 rounded bg-background/70 text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Primary badge */}
      {image.is_primary && (
        <Badge className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-[10px]">
          Principal
        </Badge>
      )}

      {/* Image */}
      <div
        className="aspect-square cursor-pointer"
        onClick={() => onPreview(image)}
      >
        <img
          src={imgSrc}
          alt={image.alt_text || 'Imagen del vehículo'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Actions overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-foreground/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 text-primary-foreground hover:text-yellow-400 hover:bg-transparent",
            image.is_primary && "text-yellow-400"
          )}
          onClick={(e) => { e.stopPropagation(); onSetPrimary(image); }}
          title="Marcar como principal"
        >
          <Star className={cn("h-4 w-4", image.is_primary && "fill-current")} />
        </Button>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20"
            onClick={(e) => { e.stopPropagation(); onEnhance(image); }}
            title="Retocar con IA"
          >
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20"
            onClick={(e) => { e.stopPropagation(); onPreview(image); }}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground hover:text-destructive hover:bg-transparent"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar imagen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. La imagen será eliminada permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(image)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

export function ImagesTab({ vehicleId }: { vehicleId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<VehicleImage | null>(null);
  const [enhanceImage, setEnhanceImage] = useState<VehicleImage | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['vehicle-images', vehicleId],
    queryFn: () => getVehicleImages(vehicleId),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user) return;

    // Validate count
    if (images.length + files.length > MAX_IMAGES) {
      toast({ title: 'Límite excedido', description: `Máximo ${MAX_IMAGES} imágenes por vehículo. Puedes añadir ${MAX_IMAGES - images.length} más.`, variant: 'destructive' });
      return;
    }

    // Validate each file
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({ title: 'Formato no válido', description: `${file.name}: solo se aceptan JPG, PNG y WEBP.`, variant: 'destructive' });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: 'Archivo muy grande', description: `${file.name}: máximo 5MB por imagen.`, variant: 'destructive' });
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        await uploadVehicleImage(files[i], vehicleId, user.id);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      toast({ title: 'Imágenes subidas', description: `${files.length} imagen(es) subida(s) correctamente.` });
      qc.invalidateQueries({ queryKey: ['vehicle-images', vehicleId] });
    } catch (err: any) {
      toast({ title: 'Error al subir', description: err.message || 'Error inesperado', variant: 'destructive' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user, vehicleId, images.length, toast, qc]);

  const handleDelete = useCallback(async (image: VehicleImage) => {
    try {
      await deleteVehicleImage(image.id, image.original_url, image.thumbnail_url);
      qc.invalidateQueries({ queryKey: ['vehicle-images', vehicleId] });
      toast({ title: 'Imagen eliminada' });
    } catch (err: any) {
      toast({ title: 'Error al eliminar', description: err.message, variant: 'destructive' });
    }
  }, [vehicleId, toast, qc]);

  const handleSetPrimary = useCallback(async (image: VehicleImage) => {
    if (image.is_primary) return;
    try {
      await setVehicleImagePrimary(image.id, vehicleId);
      qc.invalidateQueries({ queryKey: ['vehicle-images', vehicleId] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [vehicleId, toast, qc]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex(i => i.id === active.id);
    const newIndex = images.findIndex(i => i.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex);

    // Optimistic update
    qc.setQueryData(['vehicle-images', vehicleId], reordered);

    try {
      await updateVehicleImageOrder(reordered.map((img, idx) => ({ id: img.id, order_index: idx })));
    } catch (err: any) {
      qc.invalidateQueries({ queryKey: ['vehicle-images', vehicleId] });
      toast({ title: 'Error al reordenar', description: err.message, variant: 'destructive' });
    }
  }, [images, vehicleId, qc, toast]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= MAX_IMAGES}
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Subir imágenes
        </Button>
        <span className="text-xs text-muted-foreground">
          {images.length}/{MAX_IMAGES} · JPG, PNG, WEBP · Max 5MB
        </span>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">Subiendo... {uploadProgress}%</p>
        </div>
      )}

      {/* Gallery grid */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <ImagePlus className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No hay imágenes</p>
          <p className="text-xs mt-1">Sube imágenes para este vehículo</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map(i => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((image) => (
                 <SortableImageCard
                    key={image.id}
                    image={image}
                    onDelete={handleDelete}
                    onSetPrimary={handleSetPrimary}
                    onPreview={setPreviewImage}
                    onEnhance={setEnhanceImage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          {previewImage && (
            <img
              src={previewImage.original_url}
              alt={previewImage.alt_text || 'Imagen del vehículo'}
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Enhance dialog */}
      {enhanceImage && (
        <VehicleImageEnhanceDialog
          open={!!enhanceImage}
          onOpenChange={(v) => { if (!v) setEnhanceImage(null); }}
          imageUrl={enhanceImage.original_url}
        />
      )}
    </div>
  );
}
