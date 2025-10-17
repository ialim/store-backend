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

    let body: unknown;
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
      body = (await response.json()) as unknown;
    } catch (error) {
      const trace = error instanceof Error ? error.stack : undefined;
      this.logger.error('Mapbox directions request error', trace);
      throw new ServiceUnavailableException('Routing provider unavailable');
    }

    if (!this.isMapboxDirectionsResponse(body)) {
      this.logger.error(
        'Mapbox directions response missing routes or required metrics',
      );
      throw new ServiceUnavailableException('Routing provider unavailable');
    }

    const route = body.routes[0];
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

  private isMapboxDirectionsResponse(value: unknown): value is {
    routes: Array<{ distance: number; duration: number }>;
  } {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const routesRaw = (value as { routes?: unknown }).routes;
    if (!Array.isArray(routesRaw) || routesRaw.length === 0) {
      return false;
    }
    const routes: unknown[] = routesRaw;
    const first = routes[0];
    if (!first || typeof first !== 'object') {
      return false;
    }
    const { distance, duration } = first as {
      distance?: unknown;
      duration?: unknown;
    };
    return typeof distance === 'number' && typeof duration === 'number';
  }
}
