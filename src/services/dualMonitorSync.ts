// src/services/dualMonitorSync.ts
import type { CartItem, CustomerScreenTheme } from '../types';

export interface CustomerDisplayState {
  cart: CartItem[];
  subtotal: number;
  promoDiscount: number;
  customDiscount?: number;
  vatAmount?: number;
  netTotal: number;
  upsellPrompts: string[];
  lastScannedItem?: string;
  isPaid?: boolean;
  changeGiven?: number;
  cashReceived?: number;
  paymentMethod?: 'CASH' | 'PROMPTPAY' | 'SPLIT';
  
  // Customization passed from cashier
  theme?: CustomerScreenTheme;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  welcomeImageUrl?: string;
  thankYouMessage?: string;
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

  public static onUpdate(callback: (state: CustomerDisplayState) => void) {
    const ch = this.getChannel();
    ch.onmessage = (event) => {
      callback(event.data);
    };
  }
}
