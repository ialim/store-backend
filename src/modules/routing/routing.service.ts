import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

export enum RoutingProfile {
  DRIVING = 'driving',
  WALKING = 'walking',
  CYCLING = 'cycling',
}

export type RouteEstimate = {
  distanceMeters: number;
  durationSeconds: number;
  provider: string;
  profile: RoutingProfile;
};

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  private readonly baseUrl =
    process.env.MAPBOX_DIRECTIONS_ENDPOINT ??
    'https://api.mapbox.com/directions/v5/mapbox';

  async estimateRoute(options: {
    profile: RoutingProfile;
    coordinates: Array<{ latitude: number; longitude: number }>;
  }): Promise<RouteEstimate> {
    if (!this.accessToken) {
      throw new ServiceUnavailableException(
        'MAPBOX_ACCESS_TOKEN not configured',
      );
    }

    if (options.coordinates.length < 2) {
      throw new ServiceUnavailableException(
        'At least two coordinates are required for routing',
      );
    }

    const segments = options.coordinates
      .map((coord) => `${coord.longitude},${coord.latitude}`)
      .join(';');

    const url = `${this.baseUrl}/${options.profile}/${segments}?overview=false&alternatives=false&annotations=duration,distance&access_token=${this.accessToken}`;

    let body: any;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        this.logger.error(
          `Mapbox directions failed: ${response.status} ${text}`,
        );
        throw new ServiceUnavailableException(
          'Failed to retrieve route from Mapbox',
        );
      }
      body = await response.json();
    } catch (error) {
      this.logger.error('Mapbox directions request error', error as Error);
      throw new ServiceUnavailableException('Routing provider unavailable');
    }

    const route = body?.routes?.[0];
    if (!route) {
      throw new ServiceUnavailableException(
        'No routes available for the provided coordinates',
      );
    }

    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      provider: 'MAPBOX',
      profile: options.profile,
    };
  }
}
