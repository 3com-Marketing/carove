import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, RotateCcw, Palette } from 'lucide-react';
import { ImageEnhancer } from '@/components/marketing/ImageEnhancer';
import { View360Placeholder } from '@/components/marketing/View360Placeholder';
import { SocialMediaEditor } from '@/components/marketing/SocialMediaEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EnhancedImage {
  id: string;
  originalUrl: string;
  enhancedUrl: string;
  createdAt: string;
}

export default function ImageGeneratorPage() {
  const [enhancedImages, setEnhancedImages] = useState<EnhancedImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = useCallback(async () => {
    const { data, error } = await supabase
      .from('enhanced_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else if (data) {
      const mapped: EnhancedImage[] = data.map((row: any) => {
        const { data: { publicUrl: originalUrl } } = supabase.storage
          .from('enhanced-images')
          .getPublicUrl(row.original_path);
        const { data: { publicUrl: enhancedUrl } } = supabase.storage
          .from('enhanced-images')
          .getPublicUrl(row.enhanced_path);
        return {
          id: row.id,
          originalUrl,
          enhancedUrl,
          createdAt: row.created_at,
        };
      });
      setEnhancedImages(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleImageEnhanced = () => {
    fetchImages();
  };

  const handleDeleteImage = async (id: string) => {
    const img = enhancedImages.find(i => i.id === id);
    if (!img) return;

    // Get paths from DB before deleting
    const { data: row } = await supabase
      .from('enhanced_images')
      .select('original_path, enhanced_path')
      .eq('id', id)
      .single();

    if (row) {
      await supabase.storage.from('enhanced-images').remove([row.original_path, row.enhanced_path]);
    }

    const { error } = await supabase
      .from('enhanced_images')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Error al eliminar la imagen');
    } else {
      setEnhancedImages(prev => prev.filter(i => i.id !== id));
      toast.success('Imagen eliminada');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Generador de Imágenes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Retoca fotos de vehículos con IA, crea vistas 360° y diseña creatividades para redes sociales.
        </p>
      </div>

      <Tabs defaultValue="enhance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="enhance" className="gap-2">
            <Wand2 className="h-4 w-4" />Retoque IA
          </TabsTrigger>
          <TabsTrigger value="360" className="gap-2">
            <RotateCcw className="h-4 w-4" />Vista 360°
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enhance">
          <ImageEnhancer
            onImageEnhanced={handleImageEnhanced}
            enhancedImages={enhancedImages}
            onDeleteImage={handleDeleteImage}
            loading={loading}
          />
        </TabsContent>
        <TabsContent value="360">
          <View360Placeholder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
