import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { StaffService } from './staff.service';
import { CreateStaffInput } from './dto/create-staff.input';
import { AssignStoreManagerInput } from './dto/assign-store-manager.input';
import { AssignBillerInput } from './dto/assign-biller.input';
import { User } from '../../shared/prismagraphql/user/user.model';
import { Store } from '../../shared/prismagraphql/store/store.model';
import { ResellerProfile } from '../../shared/prismagraphql/reseller-profile/reseller-profile.model';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { PERMISSIONS } from '../../../shared/permissions';

@Resolver()
export class StaffResolver {
  constructor(private readonly staffService: StaffService) {}

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.staff.CREATE as string)
  createStaff(@Args('input') input: CreateStaffInput) {
    return this.staffService.createStaff(input);
  }

  @Mutation(() => Store)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.store.UPDATE as string)
  assignStoreManager(@Args('input') input: AssignStoreManagerInput) {
    return this.staffService.assignStoreManager(input);
  }

  @Mutation(() => ResellerProfile)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.resellerProfile.UPDATE as string)
  assignBiller(@Args('input') input: AssignBillerInput) {
    return this.staffService.assignBiller(input);
  }
}
