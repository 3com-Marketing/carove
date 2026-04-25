import { cn } from '@/lib/utils';

export interface TemplateConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'story' | 'post' | 'banner';
  bgGradient: string;
  accentColor: string;
  textColor: string;
  layout: 'centered' | 'split' | 'overlay' | 'minimal' | 'bold' | 'elegant' | 'promo' | 'halftone' | 'diagonal';
  secondaryColor?: string;
  hasBottomBar?: boolean;
  hasDiagonal?: boolean;
}

// Carove brand green: #3B8C5C
const CAROVE_GREEN = '#3B8C5C';
const CAROVE_GREEN_DARK = '#2D6B46';
const CAROVE_GREEN_LIGHT = '#4DA870';

export const TEMPLATES: TemplateConfig[] = [
  // Stories
  { id: 'story-carove', name: 'Story Carove', width: 1080, height: 1920, category: 'story', bgGradient: 'from-gray-950 via-gray-900 to-black', accentColor: CAROVE_GREEN, textColor: '#ffffff', layout: 'centered', hasBottomBar: true },
  { id: 'story-sport', name: 'Story Deportivo', width: 1080, height: 1920, category: 'story', bgGradient: 'from-black via-gray-900 to-black', accentColor: CAROVE_GREEN_LIGHT, textColor: '#ffffff', layout: 'bold', hasDiagonal: true },
  { id: 'story-promo', name: 'Story Promoción', width: 1080, height: 1920, category: 'story', bgGradient: 'from-emerald-900 via-emerald-800 to-black', accentColor: '#ffffff', textColor: '#ffffff', layout: 'promo', hasBottomBar: true },

  // Posts
  { id: 'post-carove', name: 'Post Carove', width: 1080, height: 1080, category: 'post', bgGradient: 'from-gray-950 via-gray-900 to-black', accentColor: CAROVE_GREEN, textColor: '#ffffff', layout: 'elegant', hasBottomBar: true },
  { id: 'post-halftone', name: 'Post Impacto', width: 1080, height: 1080, category: 'post', bgGradient: 'from-black via-gray-950 to-black', accentColor: CAROVE_GREEN, textColor: '#ffffff', layout: 'halftone', secondaryColor: CAROVE_GREEN_DARK },
  { id: 'post-minimal', name: 'Post Minimal', width: 1080, height: 1080, category: 'post', bgGradient: 'from-white to-gray-50', accentColor: CAROVE_GREEN, textColor: '#1a1a1a', layout: 'minimal', hasBottomBar: true },
  { id: 'post-diagonal', name: 'Post Diagonal', width: 1080, height: 1080, category: 'post', bgGradient: 'from-black to-gray-900', accentColor: CAROVE_GREEN, textColor: '#ffffff', layout: 'diagonal', hasDiagonal: true, secondaryColor: CAROVE_GREEN_DARK },
  { id: 'post-green', name: 'Post Verde', width: 1080, height: 1080, category: 'post', bgGradient: 'from-emerald-800 via-emerald-700 to-emerald-900', accentColor: '#ffffff', textColor: '#ffffff', layout: 'overlay' },

  // Banners
  { id: 'banner-carove', name: 'Banner Carove', width: 1200, height: 628, category: 'banner', bgGradient: 'from-gray-950 to-gray-900', accentColor: CAROVE_GREEN, textColor: '#ffffff', layout: 'split', hasBottomBar: true },
  { id: 'banner-promo', name: 'Banner Promo', width: 1200, height: 628, category: 'banner', bgGradient: 'from-emerald-900 via-emerald-800 to-black', accentColor: '#ffffff', textColor: '#ffffff', layout: 'promo' },
];

interface Props {
  template: TemplateConfig;
  selected: boolean;
  onClick: () => void;
}

export function TemplateCard({ template, selected, onClick }: Props) {
  const aspect = template.width / template.height;

  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg border-2 overflow-hidden transition-all hover:shadow-lg',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
      )}
    >
      <div
        className={cn('bg-gradient-to-br flex items-center justify-center relative', template.bgGradient)}
        style={{ aspectRatio: aspect, minHeight: 80 }}
      >
        {/* Diagonal stripe preview */}
        {template.hasDiagonal && (
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-30" style={{
            background: `linear-gradient(135deg, transparent 30%, ${template.accentColor} 30%, ${template.accentColor} 45%, transparent 45%)`,
          }} />
        )}
        <div className="text-center px-2 z-10">
          <div className="w-8 h-5 mx-auto mb-1 rounded-sm border border-white/20 bg-white/10" />
          <div className="h-1.5 w-12 mx-auto rounded bg-white/30 mb-0.5" />
          <div className="h-1 w-8 mx-auto rounded" style={{ backgroundColor: template.accentColor }} />
        </div>
        {/* Bottom bar preview */}
        {template.hasBottomBar && (
          <div className="absolute bottom-0 inset-x-0 h-2" style={{ backgroundColor: template.accentColor }} />
        )}
      </div>
      <div className="px-2 py-1.5 bg-card">
        <p className="text-[10px] font-medium text-foreground truncate">{template.name}</p>
        <p className="text-[9px] text-muted-foreground">{template.width}×{template.height}</p>
      </div>
    </button>
  );
}
