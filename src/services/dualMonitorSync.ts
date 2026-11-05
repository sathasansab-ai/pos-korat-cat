// src/services/dualMonitorSync.ts
import type { CartItem, CustomerScreenTheme, StoreSettings } from '../types';

export interface CustomerDisplayState {
  cart: CartItem[];
  subtotal: number;
  promoDiscount: number;
  memberDiscount?: number;
  memberTier?: string;
  customDiscount?: number;
  vatAmount?: number;
  netTotal: number;
  upsellPrompts: string[];
  lastScannedItem?: string;
  isPaid?: boolean;
  isCheckoutStep?: boolean;
  changeGiven?: number;
  cashReceived?: number;
  paymentMethod?: 'CASH' | 'PROMPTPAY' | 'SPLIT';
  
  // Customization passed from cashier
  theme?: CustomerScreenTheme;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  welcomeImageUrl?: string;
  thankYouMessage?: string;
  fullSettings?: StoreSettings;

  // Digital Pass Showcase (โชว์บัตรสมาชิกหรูหราที่หน้าจอลูกค้าเพื่อสแกน)
  showDigitalPass?: boolean;
  memberPassData?: {
    name: string;
    phone: string;
    memberCode: string;
    tier: string;
    points: number;
    qrDataUrl?: string;
    barcodeDataUrl?: string;
  };
}

const CHANNEL_NAME = 'pos_korat_dual_screen_channel';

export class DualMonitorSync {
  private static channel: BroadcastChannel | null = null;

  private static getChannel(): BroadcastChannel {
    if (!this.channel) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
    }
    return this.channel;
  }

  public static broadcast(state: CustomerDisplayState) {
    try {
      this.getChannel().postMessage(state);
    } catch (e) {
      console.error('Failed to broadcast to customer monitor', e);
    }
  }

  public static broadcastSettings(settings: StoreSettings) {
    try {
      this.getChannel().postMessage({
        cart: [],
        subtotal: 0,
        promoDiscount: 0,
        netTotal: 0,
        upsellPrompts: [],
        fullSettings: settings,
        theme: settings.customerScreenTheme,
        welcomeTitle: settings.welcomeTitle,
        welcomeSubtitle: settings.welcomeSubtitle,
        welcomeImageUrl: settings.welcomeImageUrl,
        thankYouMessage: settings.thankYouMessage
      });
    } catch (e) {
      console.error('Failed to broadcast settings to customer monitor', e);
    }
  }

  public static onUpdate(callback: (state: CustomerDisplayState) => void) {
    const ch = this.getChannel();
    ch.onmessage = (event) => {
      callback(event.data);
    };
  }
}
