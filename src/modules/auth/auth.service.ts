import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginInput } from './dto/login.input';
import { ChangePasswordInput } from './dto/change-password.input';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(loginInput: LoginInput) {
    const user = await this.validateUser(loginInput.email, loginInput.password);
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true },
    });
    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: fullUser?.role?.name,
    } as any;
    return {
      accessToken: this.jwtService.sign(payload),
      user: fullUser!,
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (!input.newPassword || input.newPassword.length < 8) {
      throw new UnauthorizedException(
        'New password must be at least 8 characters',
      );
    }
    const newHash = await bcrypt.hash(input.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    return true;
  }
}
