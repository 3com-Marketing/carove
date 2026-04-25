import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Instagram, Upload, Sparkles, CalendarIcon, Clock, Loader2, ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Publication {
  id?: string;
  platform: string;
  caption: string;
  hashtags: string;
  image_url: string | null;
  generated_image_id: string | null;
  status: string;
  scheduled_at: string | null;
  ai_generated: boolean;
  ai_prompt: string | null;
  ai_tone: string | null;
}

interface EnhancedImageOption {
  id: string;
  url: string;
  createdAt: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publication?: Publication | null;
  defaultDate?: Date;
  onSaved: () => void;
}

export function PublicationDrawer({ open, onOpenChange, publication, defaultDate, onSaved }: Props) {
  const { user } = useAuth();
  const [platform, setPlatform] = useState('instagram');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatedImageId, setGeneratedImageId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(defaultDate || new Date());
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [publishMode, setPublishMode] = useState<'schedule' | 'now'>('schedule');
  const [saving, setSaving] = useState(false);

  // AI caption state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [aiTone, setAiTone] = useState('profesional');
  const [aiLang, setAiLang] = useState('es');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);

  // Image gallery
  const [galleryImages, setGalleryImages] = useState<EnhancedImageOption[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  useEffect(() => {
    if (open) {
      if (publication) {
        setPlatform(publication.platform);
        setCaption(publication.caption || '');
        setHashtags(publication.hashtags || '');
        setImageUrl(publication.image_url);
        setGeneratedImageId(publication.generated_image_id);
        if (publication.scheduled_at) {
          const d = new Date(publication.scheduled_at);
          setScheduledDate(d);
          setScheduledTime(format(d, 'HH:mm'));
        }
      } else {
        setPlatform('instagram');
        setCaption('');
        setHashtags('');
        setImageUrl(null);
        setGeneratedImageId(null);
        setScheduledDate(defaultDate || new Date());
        setScheduledTime('10:00');
        setPublishMode('schedule');
        setShowAiPanel(false);
      }
      fetchGallery();
    }
  }, [open, publication, defaultDate]);

  const fetchGallery = async () => {
    setLoadingGallery(true);
    const { data } = await supabase
      .from('enhanced_images')
      .select('id, enhanced_path, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setGalleryImages(data.map((row: any) => {
        const { data: { publicUrl } } = supabase.storage
          .from('enhanced-images')
          .getPublicUrl(row.enhanced_path);
        return { id: row.id, url: publicUrl, createdAt: row.created_at };
      }));
    }
    setLoadingGallery(false);
  };

  const handleSelectGalleryImage = (img: EnhancedImageOption) => {
    setImageUrl(img.url);
    setGeneratedImageId(img.id);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const path = `publications/${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('enhanced-images').upload(path, file);
    if (error) {
      toast.error('Error al subir imagen');
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('enhanced-images').getPublicUrl(path);
    setImageUrl(publicUrl);
    setGeneratedImageId(null);
  };

  const handleGenerateCaption = async () => {
    if (!aiContext.trim()) {
      toast.error('Escribe una descripción del post');
      return;
    }
    setGeneratingCaption(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-caption', {
        body: { context: aiContext, tone: aiTone, language: aiLang, includeHashtags, includeCTA },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setCaption(data.caption || '');
      setShowAiPanel(false);
      toast.success('Caption generado');
    } catch (err: any) {
      toast.error(err.message || 'Error generando caption');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handleSave = async (status: 'draft' | 'scheduled' | 'published') => {
    if (!user) return;
    setSaving(true);

    let scheduledAt: string | null = null;
    if (status === 'scheduled' && scheduledDate) {
      const [h, m] = scheduledTime.split(':').map(Number);
      const d = new Date(scheduledDate);
      d.setHours(h, m, 0, 0);
      scheduledAt = d.toISOString();
    }

    const payload = {
      user_id: user.id,
      platform,
      caption,
      hashtags,
      image_url: imageUrl,
      generated_image_id: generatedImageId,
      status,
      scheduled_at: scheduledAt,
      published_at: status === 'published' ? new Date().toISOString() : null,
      ai_generated: caption.length > 0 && showAiPanel,
      ai_prompt: aiContext || null,
      ai_tone: aiTone || null,
    };

    let error;
    if (publication?.id) {
      ({ error } = await supabase.from('publications').update(payload).eq('id', publication.id));
    } else {
      ({ error } = await supabase.from('publications').insert(payload as any));
    }

    setSaving(false);
    if (error) {
      toast.error('Error al guardar publicación');
      console.error(error);
    } else {
      toast.success(
        status === 'draft' ? 'Borrador guardado' :
        status === 'scheduled' ? 'Publicación programada' :
        'Publicación guardada'
      );
      onSaved();
      onOpenChange(false);
    }
  };

  const charCount = caption.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{publication?.id ? 'Editar Publicación' : 'Nueva Publicación'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Platform */}
          <div className="space-y-2">
            <Label>Red Social</Label>
            <div className="flex gap-2">
              <Button
                variant={platform === 'instagram' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPlatform('instagram')}
                className="gap-2"
              >
                <Instagram className="h-4 w-4" /> Instagram
              </Button>
              <Button variant="outline" size="sm" disabled className="gap-2 opacity-50">
                Facebook <Badge variant="secondary" className="text-[10px] ml-1">Próx.</Badge>
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Imagen</Label>
            <Tabs defaultValue="gallery" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="gallery" className="flex-1 gap-1 text-xs">
                  <ImageIcon className="h-3 w-3" /> Generador
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1 gap-1 text-xs">
                  <Upload className="h-3 w-3" /> Subir
                </TabsTrigger>
              </TabsList>
              <TabsContent value="gallery">
                {loadingGallery ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : galleryImages.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No hay imágenes generadas aún.</p>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="grid grid-cols-4 gap-2 p-1">
                      {galleryImages.map(img => (
                        <button
                          key={img.id}
                          onClick={() => handleSelectGalleryImage(img)}
                          className={cn(
                            "aspect-square rounded-md overflow-hidden border-2 transition-all",
                            generatedImageId === img.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                          )}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
              <TabsContent value="upload">
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Seleccionar imagen</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                </label>
              </TabsContent>
            </Tabs>

            {imageUrl && (
              <div className="relative">
                <div className="bg-muted rounded-lg p-3 flex justify-center">
                  {/* Instagram mock preview */}
                  <div className="w-64 bg-background rounded-xl overflow-hidden shadow-lg border border-border">
                    <div className="flex items-center gap-2 p-2 border-b border-border">
                      <div className="w-6 h-6 rounded-full bg-primary/20" />
                      <span className="text-xs font-medium">carove_coches</span>
                    </div>
                    <img src={imageUrl} alt="preview" className="w-full aspect-square object-cover" />
                    <div className="p-2">
                      <div className="text-[10px] text-muted-foreground line-clamp-2 prose prose-xs">
                        <ReactMarkdown>{caption || 'Tu caption aquí...'}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="absolute top-1 right-1 text-xs" onClick={() => { setImageUrl(null); setGeneratedImageId(null); }}>
                  Cambiar
                </Button>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Caption</Label>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowAiPanel(!showAiPanel)}>
                <Sparkles className="h-3 w-3" /> Generar con IA
              </Button>
            </div>

            {showAiPanel && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
                <div className="space-y-1">
                  <Label className="text-xs">¿De qué trata el post?</Label>
                  <Input placeholder="Ej: Nuevo BMW Serie 3 disponible..." value={aiContext} onChange={e => setAiContext(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tono</Label>
                    <Select value={aiTone} onValueChange={setAiTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="profesional">Profesional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="inspiracional">Inspiracional</SelectItem>
                        <SelectItem value="promocional">Promocional</SelectItem>
                        <SelectItem value="educativo">Educativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Idioma</Label>
                    <Select value={aiLang} onValueChange={setAiLang}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">Inglés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={includeHashtags} onCheckedChange={setIncludeHashtags} id="ai-hashtags" />
                    <Label htmlFor="ai-hashtags" className="text-xs">Hashtags</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={includeCTA} onCheckedChange={setIncludeCTA} id="ai-cta" />
                    <Label htmlFor="ai-cta" className="text-xs">Call-to-action</Label>
                  </div>
                </div>
                <Button onClick={handleGenerateCaption} disabled={generatingCaption} className="w-full gap-2" size="sm">
                  {generatingCaption ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generatingCaption ? 'Generando...' : 'Generar Caption'}
                </Button>
              </div>
            )}

            <Textarea
              placeholder="Escribe el caption de tu publicación..."
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={5}
              maxLength={2200}
            />
            <p className={cn("text-xs text-right", charCount > 2000 ? "text-destructive" : "text-muted-foreground")}>
              {charCount} / 2.200
            </p>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags adicionales</Label>
            <Input placeholder="#coches #carove #vehiculosocasion" value={hashtags} onChange={e => setHashtags(e.target.value)} />
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <Label>Programación</Label>
            <div className="flex gap-2">
              <Button
                variant={publishMode === 'schedule' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPublishMode('schedule')}
              >
                Programar
              </Button>
              <Button
                variant={publishMode === 'now' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPublishMode('now')}
              >
                Publicar ahora
              </Button>
            </div>

            {publishMode === 'schedule' && (
              <div className="flex gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, 'dd/MM/yyyy', { locale: es }) : 'Fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} locale={es} />
                  </PopoverContent>
                </Popover>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="w-28"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Zona horaria: Europe/Madrid (Canarias UTC+0)</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button variant="outline" className="flex-1" disabled={saving} onClick={() => handleSave('draft')}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar borrador'}
            </Button>
            {publishMode === 'schedule' ? (
              <Button className="flex-1" disabled={saving} onClick={() => handleSave('scheduled')}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Programar publicación'}
              </Button>
            ) : (
              <Button className="flex-1" disabled={saving} onClick={() => handleSave('published')}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publicar ahora'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
