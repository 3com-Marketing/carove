import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Mail, CalendarCheck, Wrench } from 'lucide-react';
import { ActivityDialog } from './ActivityDialog';
import type { ActivityChannel } from '@/lib/types';

interface Props {
  buyerId: string;
  onSaved?: () => void;
}

const QUICK_BUTTONS: { label: string; channel: ActivityChannel; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Llamada', channel: 'llamada_saliente', icon: Phone },
  { label: 'WhatsApp', channel: 'whatsapp', icon: MessageCircle },
  { label: 'Email', channel: 'email', icon: Mail },
  { label: 'Reunión', channel: 'reunion_presencial', icon: CalendarCheck },
  { label: 'Postventa', channel: 'gestion_postventa', icon: Wrench },
];

export function QuickActivityButtons({ buyerId, onSaved }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ActivityChannel>('llamada_saliente');

  const handleClick = (channel: ActivityChannel) => {
    setSelectedChannel(channel);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {QUICK_BUTTONS.map(({ label, channel, icon: Icon }) => (
          <Button key={channel} variant="outline" size="sm" onClick={() => handleClick(channel)}>
            <Icon className="h-4 w-4 mr-1.5" />
            {label}
          </Button>
        ))}
      </div>

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        presetChannel={selectedChannel}
        presetBuyerId={buyerId}
        onSaved={onSaved}
      />
    </>
  );
}
