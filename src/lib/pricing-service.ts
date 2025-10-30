import { supabase } from './supabase';
import { SoraModel, Resolution, VideoDuration } from './sora-api';

export interface PricingConfig {
  id: string;
  model: string;
  resolution: string | null;
  duration: number | null;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class PricingService {
  private cachedPricing: PricingConfig[] = [];
  private lastFetch: number = 0;
  private cacheDuration = 5 * 60 * 1000;

  async getPricing(): Promise<PricingConfig[]> {
    const now = Date.now();
    if (this.cachedPricing.length > 0 && now - this.lastFetch < this.cacheDuration) {
      return this.cachedPricing;
    }

    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .eq('is_active', true)
      .order('model')
      .order('duration');

    if (error) {
      throw new Error(`Failed to fetch pricing: ${error.message}`);
    }

    this.cachedPricing = data || [];
    this.lastFetch = now;
    return this.cachedPricing;
  }

  async calculateCost(
    model: SoraModel,
    resolution: Resolution,
    duration: VideoDuration
  ): Promise<number> {
    const pricing = await this.getPricing();

    const exactMatch = pricing.find(
      (p) =>
        p.model === model &&
        p.resolution === resolution &&
        p.duration === duration
    );

    if (exactMatch) {
      return Number(exactMatch.price);
    }

    const modelMatch = pricing.find(
      (p) =>
        p.model === model &&
        p.resolution === null &&
        p.duration === null
    );

    if (modelMatch) {
      return Number(modelMatch.price);
    }

    const defaultPrice = model === 'sora-2-pro' ? 3.0 : 1.5;
    return defaultPrice;
  }

  async getPriceBreakdown(
    model: SoraModel,
    resolution: Resolution,
    duration: VideoDuration
  ): Promise<{
    basePrice: number;
    model: string;
    resolution: string;
    duration: string;
    total: number;
  }> {
    const cost = await this.calculateCost(model, resolution, duration);

    return {
      basePrice: cost,
      model: model,
      resolution: resolution,
      duration: `${duration}s`,
      total: cost,
    };
  }

  clearCache(): void {
    this.cachedPricing = [];
    this.lastFetch = 0;
  }
}
