import { forwardRef } from 'react';
import type { TemplateConfig } from './TemplateCard';
import type { TextFields } from './SocialMediaEditor';
import caroveLogo from '@/assets/carove-logo.png';

interface Props {
  template: TemplateConfig;
  carImage: string | null;
  texts: TextFields;
}

export const SocialMediaPreview = forwardRef<HTMLDivElement, Props>(
  ({ template: t, carImage, texts }, ref) => {
    const scale = Math.min(400 / t.width, 600 / t.height, 1);
    const isDark = t.textColor === '#ffffff';
    const w = t.width * scale;
    const h = t.height * scale;
    const fs = (ratio: number) => w * ratio;

    return (
      <div
        ref={ref}
        className={`bg-gradient-to-br ${t.bgGradient} relative overflow-hidden`}
        style={{ width: w, height: h }}
      >
        {/* Diagonal stripe decoration */}
        {t.hasDiagonal && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `linear-gradient(135deg, transparent 55%, ${t.secondaryColor || t.accentColor}33 55%, ${t.secondaryColor || t.accentColor}22 70%, transparent 70%)`,
          }} />
        )}

        {/* Car image */}
        {carImage && (
          <div className="absolute inset-0 flex items-center justify-center" style={{
            paddingTop: t.category === 'story' ? '25%' : '8%',
            paddingBottom: t.hasBottomBar ? '18%' : '15%',
          }}>
            <img
              src={carImage}
              alt="Vehículo"
              className="max-w-[88%] max-h-full object-contain drop-shadow-2xl"
            />
          </div>
        )}

        {/* Overlay gradients for text readability */}
        {isDark && (
          <>
            <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/70 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
          </>
        )}

        {/* Carove logo watermark */}
        <div className="absolute" style={{
          top: '4%', right: '4%',
          width: fs(0.18), height: fs(0.06),
        }}>
          <img src={caroveLogo} alt="Carove" className="w-full h-full object-contain" style={{
            filter: isDark ? 'brightness(10)' : 'none',
            opacity: 0.8,
          }} />
        </div>

        {/* Top section - Brand & Model */}
        <div className="absolute" style={{
          top: '5%', left: '5%', right: '25%',
        }}>
          <p className="font-black uppercase" style={{
            color: t.accentColor,
            fontSize: fs(0.032),
            letterSpacing: '0.15em',
          }}>
            {texts.brand}
          </p>
          <p className="font-extrabold leading-[1.1] mt-1" style={{
            color: t.textColor,
            fontSize: fs(0.06),
          }}>
            {texts.model}
          </p>
        </div>

        {/* Bottom section */}
        <div className="absolute" style={{
          bottom: t.hasBottomBar ? `${fs(0.06) + 8}px` : '5%',
          left: '5%', right: '5%',
        }}>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="font-extrabold" style={{
                color: t.accentColor,
                fontSize: fs(0.075),
              }}>
                {texts.price}
              </p>
              <p className="opacity-80 mt-0.5" style={{
                color: t.textColor,
                fontSize: fs(0.022),
              }}>
                {texts.year} · {texts.specs}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="px-3 py-1.5 rounded font-bold uppercase" style={{
                backgroundColor: t.accentColor,
                color: isDark ? '#000' : '#fff',
                fontSize: fs(0.024),
                letterSpacing: '0.05em',
              }}>
                {texts.cta}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom brand bar (Carove style green strip) */}
        {t.hasBottomBar && (
          <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-[5%]" style={{
            height: fs(0.055),
            backgroundColor: t.accentColor,
          }}>
            <div className="flex items-center gap-1">
              <img src={caroveLogo} alt="Carove" className="object-contain" style={{
                height: fs(0.032),
                filter: 'brightness(10)',
              }} />
            </div>
            <p className="font-semibold" style={{
              color: '#ffffff',
              fontSize: fs(0.016),
              letterSpacing: '0.05em',
            }}>
              {texts.dealerName}
            </p>
          </div>
        )}

        {/* Decorative accent line (non-bar templates) */}
        {!t.hasBottomBar && (
          <div
            className="absolute left-0 top-[40%] w-1 h-[20%] rounded-r"
            style={{ backgroundColor: t.accentColor }}
          />
        )}

        {/* Dealer name for non-bar templates */}
        {!t.hasBottomBar && (
          <p className="absolute opacity-60" style={{
            bottom: '2%', right: '5%',
            color: t.textColor,
            fontSize: fs(0.016),
          }}>
            {texts.dealerName}
          </p>
        )}
      </div>
    );
  }
);

SocialMediaPreview.displayName = 'SocialMediaPreview';
