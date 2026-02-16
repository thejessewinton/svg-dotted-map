import type { MapPointsResult } from './types';

let cachedKey: string | null = null;
let cachedValue: MapPointsResult | null = null;

export const pointsCache = {
  get(key: string): MapPointsResult | undefined {
    return key === cachedKey && cachedValue ? cachedValue : undefined;
  },
  set(key: string, value: MapPointsResult): void {
    cachedKey = key;
    cachedValue = value;
  },
};
