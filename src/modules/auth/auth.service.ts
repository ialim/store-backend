import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { compare as bcryptCompare, hash as bcryptHash } from 'bcrypt';
import { LoginInput } from './dto/login.input';
import { ChangePasswordInput } from './dto/change-password.input';
import { User, Role, Permission } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  roleId: string | null;
  roleName?: string;
};

export type AuthenticatedRole = Role & { permissions?: Permission[] };

export type AuthenticatedUser = User & { role: AuthenticatedRole | null };

type BcryptCompare = (
  data: string | Buffer,
  encrypted: string,
) => Promise<boolean>;

type BcryptHash = (
  data: string | Buffer,
  saltOrRounds: string | number,
) => Promise<string>;

const safeBcryptCompare: BcryptCompare = bcryptCompare as BcryptCompare;
const safeBcryptHash: BcryptHash = bcryptHash as BcryptHash;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordMatches = user
      ? await safeBcryptCompare(password, user.passwordHash)
      : false;
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(loginInput: LoginInput): Promise<{
    accessToken: string;
    user: AuthenticatedUser;
  }> {
    const user = await this.validateUser(loginInput.email, loginInput.password);
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { role: { include: { permissions: true } } },
    });
    if (!fullUser) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: fullUser.role?.name,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: fullUser,
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const ok = await safeBcryptCompare(
      input.currentPassword,
      user.passwordHash,
    );
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (!input.newPassword || input.newPassword.length < 8) {
      throw new UnauthorizedException(
        'New password must be at least 8 characters',
      );
    }
    const newHash = await safeBcryptHash(input.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    return true;
  }
}
