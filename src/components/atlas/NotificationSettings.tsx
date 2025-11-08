"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

interface NotificationPreferences {
  airdrops: boolean;
  governance: boolean;
  mevOpportunities: boolean;
  priceAlerts: boolean;
  dcaBotStatus: boolean;
  rugAlerts: boolean;
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    if (typeof window === 'undefined') return {
      airdrops: false,
      governance: false,
      mevOpportunities: false,
      priceAlerts: false,
      dcaBotStatus: false,
      rugAlerts: true,
    };
    
    const saved = localStorage.getItem('atlas-notification-prefs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    
    return {
      airdrops: false,
      governance: false,
      mevOpportunities: false,
      priceAlerts: false,
      dcaBotStatus: false,
      rugAlerts: true, // Default to security alerts enabled
    };
  });

  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePreferences = () => {
    setSaving(true);
    localStorage.setItem('atlas-notification-prefs', JSON.stringify(preferences));
    setTimeout(() => {
      setSaving(false);
      toast.success("Notification preferences saved");
    }, 500);
  };

  return (
    <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-sm leading-none flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span>Alert Preferences</span>
        </CardTitle>
        <div className="text-xs opacity-70 mt-2">
          Configure notifications for time-sensitive opportunities
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="airdrops" className="text-xs cursor-pointer">
              <div className="font-medium">Airdrop Eligibility</div>
              <div className="text-[10px] opacity-70 mt-0.5">New airdrop opportunities detected</div>
            </Label>
            <Switch
              id="airdrops"
              checked={preferences.airdrops}
              onCheckedChange={() => handleToggle('airdrops')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="governance" className="text-xs cursor-pointer">
              <div className="font-medium">Governance Proposals</div>
              <div className="text-[10px] opacity-70 mt-0.5">New proposals in tracked DAOs</div>
            </Label>
            <Switch
              id="governance"
              checked={preferences.governance}
              onCheckedChange={() => handleToggle('governance')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="mev" className="text-xs cursor-pointer">
              <div className="font-medium">MEV Opportunities</div>
              <div className="text-[10px] opacity-70 mt-0.5">High-value arbitrage detected</div>
            </Label>
            <Switch
              id="mev"
              checked={preferences.mevOpportunities}
              onCheckedChange={() => handleToggle('mevOpportunities')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="price" className="text-xs cursor-pointer">
              <div className="font-medium">Price Alerts</div>
              <div className="text-[10px] opacity-70 mt-0.5">Significant price movements (±10%)</div>
            </Label>
            <Switch
              id="price"
              checked={preferences.priceAlerts}
              onCheckedChange={() => handleToggle('priceAlerts')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dca" className="text-xs cursor-pointer">
              <div className="font-medium">DCA Bot Status</div>
              <div className="text-[10px] opacity-70 mt-0.5">Execution and error notifications</div>
            </Label>
            <Switch
              id="dca"
              checked={preferences.dcaBotStatus}
              onCheckedChange={() => handleToggle('dcaBotStatus')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="rug" className="text-xs cursor-pointer">
              <div className="font-medium">Security Alerts</div>
              <div className="text-[10px] opacity-70 mt-0.5">Rug pull risks and contract issues</div>
            </Label>
            <Switch
              id="rug"
              checked={preferences.rugAlerts}
              onCheckedChange={() => handleToggle('rugAlerts')}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border/50">
          <Button
            size="sm"
            onClick={savePreferences}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
          <div className="text-[10px] opacity-70 mt-2 text-center">
            💡 Browser notifications require permission. We'll prompt when needed.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to check if user should be notified
export function useNotificationPreference(type: keyof NotificationPreferences): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('atlas-notification-prefs');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setEnabled(prefs[type] || false);
      } catch {}
    }
  }, [type]);

  return enabled;
}
