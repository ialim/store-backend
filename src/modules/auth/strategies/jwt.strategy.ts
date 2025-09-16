import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { JwtPayload, AuthenticatedUser } from '../auth.service';

type JwtFromRequestFunction = (req: Request) => string | null;

const bearerTokenExtractor: JwtFromRequestFunction = (req) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  return token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    const strategyOptions: StrategyOptions = {
      jwtFromRequest: bearerTokenExtractor,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'changeme',
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super(strategyOptions);
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: true } } },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
