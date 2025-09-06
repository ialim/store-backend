import { ObjectType, Field } from '@nestjs/graphql';
import { PurchaseOrder } from '../../../shared/prismagraphql/purchase-order';
import { RequisitionSummary } from './requisition-summary.type';
import { SupplierCreditStatus } from './supplier-credit-status.type';

@ObjectType()
export class AdminProcurementDashboard {
  @Field(() => [PurchaseOrder])
  overduePOs!: PurchaseOrder[];

  @Field(() => [RequisitionSummary])
  noSubmissionRequisitions!: RequisitionSummary[];

  @Field(() => [RequisitionSummary])
  partialSubmissionRequisitions!: RequisitionSummary[];

  @Field(() => [SupplierCreditStatus])
  creditBlockedSuppliers!: SupplierCreditStatus[];
}
