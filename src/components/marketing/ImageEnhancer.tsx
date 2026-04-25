import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Wand2, Download, Loader2, ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import caroveLogo from '@/assets/carove-logo.png';
import type { EnhancedImage } from '@/pages/marketing/ImageGeneratorPage';

interface Props {
  onImageEnhanced?: () => void;
  enhancedImages?: EnhancedImage[];
  onDeleteImage?: (id: string) => void;
  loading?: boolean;
}

export function ImageEnhancer({ onImageEnhanced, enhancedImages = [], onDeleteImage, loading }: Props) {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede superar 10 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOriginalImage(reader.result as string);
      setEnhancedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bytes = atob(parts[1]);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const handleEnhance = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    try {
      // Always include logo
      const resp = await fetch(caroveLogo);
      const blob = await resp.blob();
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const { data, error } = await supabase.functions.invoke('enhance-vehicle-image', {
        body: { imageBase64: originalImage, logoBase64 },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.enhancedImageBase64) {
        setEnhancedImage(data.enhancedImageBase64);

        // Save to storage and DB
        const ts = Date.now();
        const originalPath = `originals/${ts}.png`;
        const enhancedPath = `enhanced/${ts}.png`;

        const originalBlob = base64ToBlob(originalImage);
        const enhancedBlob = base64ToBlob(data.enhancedImageBase64);

        const [origUpload, enhUpload] = await Promise.all([
          supabase.storage.from('enhanced-images').upload(originalPath, originalBlob, { contentType: 'image/png' }),
          supabase.storage.from('enhanced-images').upload(enhancedPath, enhancedBlob, { contentType: 'image/png' }),
        ]);

        if (origUpload.error || enhUpload.error) {
          console.error('Storage upload error:', origUpload.error, enhUpload.error);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('enhanced_images').insert({
              user_id: user.id,
              original_path: originalPath,
              enhanced_path: enhancedPath,
            });
            onImageEnhanced?.();
          }
        }

        toast.success('¡Imagen mejorada y guardada!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error al procesar la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!enhancedImage) return;
    const link = document.createElement('a');
    link.href = enhancedImage;
    link.download = `vehiculo-profesional-${Date.now()}.png`;
    link.click();
  };

  const handleReset = () => {
    setOriginalImage(null);
    setEnhancedImage(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {!originalImage ? (
        <label className="flex flex-col items-center gap-4 p-12 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Sube una foto del vehículo</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG o WebP · Máx. 10 MB</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </label>
      ) : enhancedImage ? (
        <div className="space-y-4">
          <BeforeAfterSlider beforeSrc={originalImage} afterSrc={enhancedImage} />
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleReset}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Nueva imagen
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar resultado
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-border shadow">
            <img src={originalImage} alt="Original" className="w-full max-h-[500px] object-contain bg-muted/30" />
          </div>
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
            <img src={caroveLogo} alt="Carove" className="h-5 object-contain" />
            El retoque incluye el logo de Carove
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleReset}>Cambiar imagen</Button>
            <Button onClick={handleEnhance} disabled={isProcessing}>
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Procesando…</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" />Retocar con IA</>
              )}
            </Button>
          </div>
          {isProcessing && (
            <p className="text-center text-sm text-muted-foreground animate-pulse">
              Generando imagen profesional… Esto puede tardar unos segundos.
            </p>
          )}
        </div>
      )}

      {/* Saved enhanced images gallery */}
      {enhancedImages.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Imágenes retocadas guardadas ({enhancedImages.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {enhancedImages.map(img => (
              <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border bg-muted/20">
                <img
                  src={img.enhancedUrl}
                  alt="Retocada"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = img.enhancedUrl;
                        link.download = `retocada-${img.id}.png`;
                        link.click();
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => onDeleteImage?.(img.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1">
                  <p className="text-[10px] text-white flex items-center gap-1">
                    <Wand2 className="h-2.5 w-2.5" />
                    {new Date(img.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
