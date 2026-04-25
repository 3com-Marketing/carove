import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, Type, Loader2, Wand2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { TemplateCard, TEMPLATES, type TemplateConfig } from './TemplateCard';
import { SocialMediaPreview } from './SocialMediaPreview';
import html2canvas from 'html2canvas';
import type { EnhancedImage } from '@/pages/marketing/ImageGeneratorPage';

export interface TextFields {
  brand: string;
  model: string;
  price: string;
  year: string;
  specs: string;
  cta: string;
  dealerName: string;
}

export const defaultTexts: TextFields = {
  brand: 'CAROVE',
  model: 'Modelo del vehículo',
  price: '19.990 €',
  year: '2023',
  specs: 'Diesel · 150 CV · 45.000 km',
  cta: '¡Llámanos!',
  dealerName: 'Carove Automóviles',
};

interface Props {
  enhancedImages?: EnhancedImage[];
}

export function SocialMediaEditor({ enhancedImages = [] }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig>(TEMPLATES[0]);
  const [carImage, setCarImage] = useState<string | null>(null);
  const [texts, setTexts] = useState<TextFields>({ ...defaultTexts });
  const [exporting, setExporting] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCarImage(reader.result as string);
      setShowGallery(false);
    };
    reader.readAsDataURL(file);
  };

  const selectEnhancedImage = (img: EnhancedImage) => {
    setCarImage(img.enhancedUrl);
    setShowGallery(false);
    toast.success('Imagen retocada seleccionada');
  };

  const updateText = useCallback((key: keyof TextFields, value: string) => {
    setTexts(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleExport = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `creatividad-${selectedTemplate.id}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Creatividad descargada');
    } catch {
      toast.error('Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Left panel - Controls */}
      <div className="space-y-5 order-2 lg:order-1">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Plantilla</Label>
          <Tabs defaultValue="post">
            <TabsList className="w-full">
              <TabsTrigger value="story" className="flex-1 text-xs">Stories</TabsTrigger>
              <TabsTrigger value="post" className="flex-1 text-xs">Posts</TabsTrigger>
              <TabsTrigger value="banner" className="flex-1 text-xs">Banners</TabsTrigger>
            </TabsList>
            {['story', 'post', 'banner'].map(cat => (
              <TabsContent key={cat} value={cat}>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {TEMPLATES.filter(t => t.category === cat).map(tmpl => (
                    <TemplateCard
                      key={tmpl.id}
                      template={tmpl}
                      selected={selectedTemplate.id === tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl)}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Imagen del vehículo</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" />Subir
            </Button>
            {enhancedImages.length > 0 && (
              <Button
                variant={showGallery ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setShowGallery(!showGallery)}
              >
                <Wand2 className="h-4 w-4 mr-1" />Retocadas ({enhancedImages.length})
              </Button>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

          {/* Enhanced images gallery */}
          {showGallery && enhancedImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 p-2 rounded-lg border border-border bg-muted/20 max-h-48 overflow-y-auto">
              {enhancedImages.map(img => {
                const isSelected = carImage === img.enhancedUrl;
                return (
                  <button
                    key={img.id}
                    onClick={() => selectEnhancedImage(img)}
                    className={`relative rounded-md overflow-hidden border-2 transition-all aspect-square ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={img.enhancedUrl}
                      alt="Retocada"
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-5 w-5 text-primary-foreground drop-shadow" />
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5">
                      <p className="text-[8px] text-white flex items-center gap-0.5">
                        <Wand2 className="h-2 w-2" />IA
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {enhancedImages.length === 0 && (
            <p className="text-[11px] text-muted-foreground italic">
              Genera imágenes en "Retoque IA" para usarlas aquí
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Type className="h-3.5 w-3.5" />Textos
          </Label>
          {([
            ['brand', 'Marca'],
            ['model', 'Modelo'],
            ['price', 'Precio'],
            ['year', 'Año'],
            ['specs', 'Especificaciones'],
            ['cta', 'Llamada a la acción'],
            ['dealerName', 'Nombre concesionario'],
          ] as [keyof TextFields, string][]).map(([key, label]) => (
            <div key={key}>
              <Label htmlFor={`txt-${key}`} className="text-xs text-muted-foreground">{label}</Label>
              <Input
                id={`txt-${key}`}
                value={texts[key]}
                onChange={e => updateText(key, e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>

        <Button onClick={handleExport} disabled={exporting} className="w-full">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          Descargar creatividad
        </Button>
      </div>

      {/* Right panel - Preview */}
      <div className="flex items-start justify-center order-1 lg:order-2">
        <div className="bg-muted/30 rounded-xl p-4 border border-border">
          <SocialMediaPreview
            ref={previewRef}
            template={selectedTemplate}
            carImage={carImage}
            texts={texts}
          />
        </div>
      </div>
    </div>
  );
}
