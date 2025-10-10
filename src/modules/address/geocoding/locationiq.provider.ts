import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AddressSource } from '@prisma/client';
import {
  GeocodeRequest,
  GeocodeResult,
  GeocodingProvider,
  GeocodeSuggestion,
} from './geocoding.provider';

type LocationIqResponse = Array<{
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
  osm_type?: string;
  osm_id?: string;
  importance?: number;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    county?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  plus_code?: string;
}>;

@Injectable()
export class LocationIqProvider implements GeocodingProvider {
  private readonly logger = new Logger(LocationIqProvider.name);
  private readonly apiKey: string | undefined;
  private readonly endpoint =
    process.env.LOCATIONIQ_ENDPOINT ??
    'https://us1.locationiq.com/v1/search.php';
  private readonly autocompleteEndpoint =
    process.env.LOCATIONIQ_AUTOCOMPLETE_ENDPOINT ??
    'https://us1.locationiq.com/v1/autocomplete.php';

  constructor() {
    this.apiKey = process.env.LOCATIONIQ_API_KEY;

    if (!this.apiKey) {
      this.logger.warn(
        'LOCATIONIQ_API_KEY not configured. Geocoding requests will fail.',
      );
    }
  }

  async geocode(request: GeocodeRequest): Promise<GeocodeResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Geocoding provider not configured',
      );
    }

    const searchParams = new URLSearchParams({
      key: this.apiKey,
      format: 'json',
      addressdetails: '1',
      limit: '1',
      q: request.query,
    });

    if (request.countryCodes && request.countryCodes.length > 0) {
      searchParams.append('countrycodes', request.countryCodes.join(','));
    }

    if (request.bias) {
      searchParams.append('viewbox', this.biasToViewBox(request.bias));
      searchParams.append('bounded', '1');
    }

    const url = `${this.endpoint}?${searchParams.toString()}`;

    let payload: LocationIqResponse | null = null;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'store-backend/1.0 (address-module)',
        },
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`LocationIQ request failed: ${res.status} ${body}`);
        throw new ServiceUnavailableException(
          'Failed to resolve address from geocoding provider',
        );
      }
      payload = (await res.json()) as LocationIqResponse;
    } catch (error: any) {
      this.logger.error('LocationIQ request error', error);
      throw new ServiceUnavailableException('Geocoding provider unavailable');
    }

    if (!payload || payload.length === 0) {
      throw new ServiceUnavailableException('No results found for address');
    }

    const result = payload[0];

    return {
      formattedAddress: result.display_name,
      streetLine1:
        result.address?.house_number && result.address?.road
          ? `${result.address.house_number} ${result.address.road}`
          : (result.address?.road ?? null),
      streetLine2:
        result.address?.neighbourhood ?? result.address?.suburb ?? null,
      city:
        result.address?.city ??
        result.address?.town ??
        result.address?.village ??
        null,
      state: result.address?.state ?? result.address?.county ?? null,
      postalCode: result.address?.postcode ?? null,
      countryCode:
        result.address?.country_code?.toUpperCase() ??
        result.address?.country ??
        'NG',
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      placeId: result.place_id,
      plusCode: result.plus_code ?? null,
      confidence: result.importance ?? null,
      provider: AddressSource.LOCATIONIQ,
      raw: result as unknown as Record<string, unknown>,
    };
  }

  async autocomplete(request: GeocodeRequest): Promise<GeocodeSuggestion[]> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Geocoding provider not configured',
      );
    }
    if (request.query.trim().length < 3) {
      return [];
    }

    const searchParams = new URLSearchParams({
      key: this.apiKey,
      format: 'json',
      q: request.query.trim(),
    });
    if (request.countryCodes && request.countryCodes.length > 0) {
      searchParams.append('countrycodes', request.countryCodes.join(','));
    }
    if (request.limit) {
      searchParams.append('limit', String(request.limit));
    }

    const url = `${this.autocompleteEndpoint}?${searchParams.toString()}`;
    let payload: LocationIqResponse | null = null;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'store-backend/1.0 (address-autocomplete)',
        },
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(
          `LocationIQ autocomplete failed: ${res.status} ${body}`,
        );
        return [];
      }
      payload = (await res.json()) as LocationIqResponse;
    } catch (error: any) {
      this.logger.error('LocationIQ autocomplete request error', error);
      return [];
    }

    if (!payload || payload.length === 0) {
      return [];
    }

    return payload.map((result) => ({
      id: result.place_id,
      formattedAddress: result.display_name,
      latitude: result.lat ? parseFloat(result.lat) : null,
      longitude: result.lon ? parseFloat(result.lon) : null,
      countryCode:
        result.address?.country_code?.toUpperCase() ??
        result.address?.country ??
        null,
      provider: AddressSource.LOCATIONIQ,
      raw: result as unknown as Record<string, unknown>,
    }));
  }

  private biasToViewBox(bias: GeocodeRequest['bias']): string {
    if (!bias) {
      return '';
    }
    const radius = (bias.radiusMeters ?? 5000) / 111_320; // approximate degrees
    const minLon = bias.longitude - radius;
    const maxLon = bias.longitude + radius;
    const minLat = bias.latitude - radius;
    const maxLat = bias.latitude + radius;
    return `${minLon},${maxLat},${maxLon},${minLat}`;
  }
}
