import { Field, Float, ID, InputType } from '@nestjs/graphql';

@InputType()
export class RiderCoverageAreaInput {
  @Field(() => ID)
  storeId!: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Optional service radius in kilometers',
  })
  serviceRadiusKm?: number | null;
}

@InputType()
export class UpsertRiderCoverageInput {
  @Field(() => ID)
  riderId!: string;

  @Field(() => [RiderCoverageAreaInput], {
    description:
      'Coverage entries to upsert; omitting clears existing entries.',
  })
  coverage!: RiderCoverageAreaInput[];
}
