import { AddressSource } from '@prisma/client';

export type GeocodeBias = {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
};

export type GeocodeRequest = {
  /**
   * Free-form address or landmark query.
   */
  query: string;
  /**
   * Optional bias to prioritize results near specific coordinates.
   */
  bias?: GeocodeBias;
  /**
   * ISO country code restriction.
   */
  countryCodes?: string[];
  /**
   * Maximum number of results to return when requesting suggestions.
   */
  limit?: number;
};

export type GeocodeResult = {
  formattedAddress: string;
  streetLine1?: string | null;
  streetLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countryCode: string;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
  plusCode?: string | null;
  confidence?: number | null;
  provider: AddressSource;
  raw: Record<string, unknown>;
};

export type GeocodeSuggestion = {
  id: string;
  formattedAddress: string;
  latitude?: number | null;
  longitude?: number | null;
  countryCode?: string | null;
  provider: AddressSource;
  raw: Record<string, unknown>;
};

export interface GeocodingProvider {
  geocode(request: GeocodeRequest): Promise<GeocodeResult>;
  autocomplete(request: GeocodeRequest): Promise<GeocodeSuggestion[]>;
}

export const GEOCODING_PROVIDER = Symbol('GEOCODING_PROVIDER');
