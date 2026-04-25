import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Instagram, Facebook, Twitter } from 'lucide-react';

interface SocialAccount {
  platform: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
  username?: string;
  available: boolean;
}

export function SocialAccountsPanel() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([
    { platform: 'Instagram', icon: Instagram, connected: false, available: true },
    { platform: 'Facebook', icon: Facebook, connected: false, available: false },
    { platform: 'X (Twitter)', icon: Twitter, connected: false, available: false },
  ]);

  const toggleConnection = (index: number) => {
    setAccounts(prev => prev.map((acc, i) => {
      if (i !== index || !acc.available) return acc;
      return {
        ...acc,
        connected: !acc.connected,
        username: !acc.connected ? '@carove_coches' : undefined,
      };
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cuentas Conectadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.map((acc, i) => {
          const Icon = acc.icon;
          return (
            <div key={acc.platform} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{acc.platform}</p>
                  {acc.connected && acc.username && (
                    <p className="text-xs text-muted-foreground">{acc.username}</p>
                  )}
                  {!acc.available && (
                    <p className="text-xs text-muted-foreground">Próximamente</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={acc.connected ? 'default' : 'secondary'} className="text-xs">
                  {acc.connected ? 'Conectada' : 'No conectada'}
                </Badge>
                {acc.available && (
                  <Switch checked={acc.connected} onCheckedChange={() => toggleConnection(i)} />
                )}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">
          * Conexión simulada para MVP. La integración real con la API de Instagram/Facebook se implementará próximamente.
        </p>
      </CardContent>
    </Card>
  );
}
