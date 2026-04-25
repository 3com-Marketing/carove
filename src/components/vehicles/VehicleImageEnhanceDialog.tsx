import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wand2, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BeforeAfterSlider } from '@/components/marketing/BeforeAfterSlider';
import caroveLogo from '@/assets/carove-logo.png';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
}

function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bytes = atob(parts[1]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function VehicleImageEnhanceDialog({ open, onOpenChange, imageUrl }: Props) {
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [originalBase64, setOriginalBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEnhance = async () => {
    setIsProcessing(true);
    try {
      // Convert image URL to base64
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      setOriginalBase64(imageBase64);

      // Always include logo
      const logoResp = await fetch(caroveLogo);
      const logoBlob = await logoResp.blob();
      const logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(logoBlob);
      });

      const { data, error } = await supabase.functions.invoke('enhance-vehicle-image', {
        body: { imageBase64, logoBase64 },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      if (data?.enhancedImageBase64) {
        setEnhancedImage(data.enhancedImageBase64);

        // Save to enhanced-images library
        const ts = Date.now();
        const originalPath = `originals/${ts}.png`;
        const enhancedPath = `enhanced/${ts}.png`;

        const origBlob = base64ToBlob(imageBase64);
        const enhBlob = base64ToBlob(data.enhancedImageBase64);

        const [origUp, enhUp] = await Promise.all([
          supabase.storage.from('enhanced-images').upload(originalPath, origBlob, { contentType: 'image/png' }),
          supabase.storage.from('enhanced-images').upload(enhancedPath, enhBlob, { contentType: 'image/png' }),
        ]);

        if (!origUp.error && !enhUp.error) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('enhanced_images').insert({
              user_id: user.id,
              original_path: originalPath,
              enhanced_path: enhancedPath,
            });
          }
        }

        toast.success('¡Imagen retocada y guardada en la biblioteca!');
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
    link.download = `vehiculo-retocado-${Date.now()}.png`;
    link.click();
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setEnhancedImage(null);
      setOriginalBase64(null);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Retoque IA
          </DialogTitle>
        </DialogHeader>

        {enhancedImage && originalBase64 ? (
          <div className="space-y-4">
            <BeforeAfterSlider beforeSrc={originalBase64} afterSrc={enhancedImage} />
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setEnhancedImage(null); setOriginalBase64(null); }}>
                Retocar de nuevo
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />Descargar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-border">
              <img src={imageUrl} alt="Original" className="w-full max-h-[400px] object-contain bg-muted/30" />
            </div>
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
              <img src={caroveLogo} alt="Carove" className="h-5 object-contain" />
              El retoque incluye el logo de Carove
            </p>
            <div className="flex justify-center">
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
      </DialogContent>
    </Dialog>
  );
}
