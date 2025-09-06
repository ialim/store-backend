import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Supplier } from '../../shared/prismagraphql/supplier';
import { PurchaseOrder } from '../../shared/prismagraphql/purchase-order';
import { SupplierPayment } from '../../shared/prismagraphql/supplier-payment';
import { PurchaseService } from './purchase.service';
import { CreateSupplierInput } from './dto/create-supplier.input';
import { UpdateSupplierInput } from './dto/update-supplier.input';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { UpdatePurchaseOrderStatusInput } from './dto/update-purchase-order-status.input';
import { CreateSupplierPaymentInput } from './dto/create-supplier-payment.input';
import { LinkSupplierUserInput } from './dto/link-supplier-user.input';
import { CreatePOsFromSelectionInput } from './dto/create-pos-from-selection.input';
import { CreatePurchaseRequisitionInput } from './dto/create-purchase-requisition.input';
import { IdInput, RejectRequisitionInput } from './dto/submit-purchase-requisition.input';
import { IssueRfqInput } from './dto/issue-rfq.input';
import { SubmitSupplierQuoteInput } from './dto/submit-supplier-quote.input';
import { SelectSupplierQuoteInput, RejectSupplierQuoteInput } from './dto/select-reject-supplier-quote.input';
import { MarkPurchaseOrderReceivedInput, UpdatePurchaseOrderPhaseInput } from './dto/update-po-phase.input';
import { RequisitionSummary } from './types/requisition-summary.type';
import { SupplierQuoteSummary } from './types/supplier-quote-summary.type';
import { SupplierCatalogEntry } from './types/supplier-catalog-entry.type';
import { RfqStatusCounts } from './types/rfq-status-counts.type';
import { RfqDashboard } from './types/rfq-dashboard.type';
import { UpsertSupplierCatalogBulkInput, UpsertSupplierCatalogInput } from './dto/upsert-supplier-catalog.input';
import { CloseRfqInput } from './dto/close-rfq.input';
import { PurchaseOrderStatus } from '../../shared/prismagraphql/prisma/purchase-order-status.enum';
import { PurchasePhase } from '../../shared/prismagraphql/prisma/purchase-phase.enum';

@Resolver()
export class PurchaseResolver {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Query(() => [Supplier])
  @UseGuards(GqlAuthGuard)
  suppliers() {
    return this.purchaseService.suppliers();
  }

  @Query(() => Supplier)
  @UseGuards(GqlAuthGuard)
  supplier(@Args('id') id: string) {
    return this.purchaseService.supplier(id);
  }

  @Mutation(() => Supplier)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createSupplier(@Args('input') input: CreateSupplierInput) {
    return this.purchaseService.createSupplier(input);
  }

  @Mutation(() => Supplier)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  updateSupplier(@Args('input') input: UpdateSupplierInput) {
    return this.purchaseService.updateSupplier(input);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard)
  purchaseOrders() {
    return this.purchaseService.purchaseOrders();
  }

  @Query(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard)
  purchaseOrder(@Args('id') id: string) {
    return this.purchaseService.purchaseOrder(id);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createPurchaseOrder(@Args('input') input: CreatePurchaseOrderInput) {
    return this.purchaseService.createPurchaseOrder(input);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  updatePurchaseOrderStatus(
    @Args('input') input: UpdatePurchaseOrderStatusInput,
  ) {
    return this.purchaseService.updatePurchaseOrderStatus(input);
  }

  @Query(() => [SupplierPayment])
  @UseGuards(GqlAuthGuard)
  supplierPayments() {
    return this.purchaseService.supplierPayments();
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard)
  purchaseOrdersByStatus(@Args('status') status: string) {
    return this.purchaseService.purchaseOrdersByStatus(status);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard)
  purchaseOrdersByStatusEnum(
    @Args('status', { type: () => PurchaseOrderStatus })
    status: PurchaseOrderStatus,
  ) {
    return this.purchaseService.purchaseOrdersByStatus(status as unknown as string);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard)
  purchaseOrdersByPhase(@Args('phase') phase: string) {
    return this.purchaseService.purchaseOrdersByPhase(phase);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard)
  purchaseOrdersByPhaseEnum(
    @Args('phase', { type: () => PurchasePhase }) phase: PurchasePhase,
  ) {
    return this.purchaseService.purchaseOrdersByPhase(phase as unknown as string);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard)
  purchaseOrdersOverdue() {
    return this.purchaseService.purchaseOrdersOverdue();
  }

  @Query(() => [RequisitionSummary])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  requisitionsByStatus(@Args('status') status: string) {
    return this.purchaseService.requisitionsByStatus(status);
  }

  @Query(() => [SupplierQuoteSummary])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  supplierQuotesByRequisition(@Args('requisitionId') requisitionId: string) {
    return this.purchaseService.supplierQuotesByRequisition(requisitionId);
  }

  // Supplier Catalog
  @Mutation(() => SupplierCatalogEntry)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  upsertSupplierCatalog(@Args('input') input: UpsertSupplierCatalogInput) {
    return this.purchaseService.upsertSupplierCatalog(input);
  }

  @Mutation(() => [String])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  upsertSupplierCatalogBulk(@Args('input') input: UpsertSupplierCatalogBulkInput) {
    return this.purchaseService.upsertSupplierCatalogBulk(input);
  }

  @Query(() => [SupplierCatalogEntry])
  @UseGuards(GqlAuthGuard)
  supplierCatalogBySupplier(@Args('supplierId') supplierId: string) {
    return this.purchaseService.supplierCatalogBySupplier(supplierId);
  }

  @Query(() => [SupplierCatalogEntry])
  @UseGuards(GqlAuthGuard)
  supplierCatalogByVariant(@Args('productVariantId') productVariantId: string) {
    return this.purchaseService.supplierCatalogByVariant(productVariantId);
  }

  // RFQ gaps
  @Query(() => [RequisitionSummary])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  requisitionsWithNoSubmittedQuotes() {
    return this.purchaseService.requisitionsWithNoSubmittedQuotes();
  }

  @Query(() => [SupplierQuoteSummary])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  rfqPendingSuppliers(@Args('requisitionId') requisitionId: string) {
    return this.purchaseService.rfqPendingSuppliers(requisitionId);
  }

  @Query(() => [RequisitionSummary])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  requisitionsWithPartialSubmissions() {
    return this.purchaseService.requisitionsWithPartialSubmissions();
  }

  @Query(() => RfqStatusCounts)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  rfqStatusCounts(@Args('requisitionId') requisitionId: string) {
    return this.purchaseService.rfqStatusCounts(requisitionId);
  }

  @Query(() => RfqStatusCounts)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  rfqCountsAll() {
    return this.purchaseService.rfqCountsAll();
  }

  @Query(() => RfqDashboard)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  rfqDashboard(@Args('requisitionId') requisitionId: string) {
    return this.purchaseService.rfqDashboard(requisitionId);
  }

  @Query(() => RfqDashboard)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  rfqDashboardAll() {
    return this.purchaseService.rfqDashboardAll();
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  selectSupplierQuote(@Args('input') input: SelectSupplierQuoteInput) {
    return this.purchaseService.selectSupplierQuote(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  rejectSupplierQuote(@Args('input') input: RejectSupplierQuoteInput) {
    return this.purchaseService.rejectSupplierQuote(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  closeRFQ(@Args('input') input: CloseRfqInput) {
    return this.purchaseService.closeRFQ(input);
  }

  @Mutation(() => Supplier)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  linkSupplierUser(@Args('input') input: LinkSupplierUserInput) {
    return this.purchaseService.linkSupplierUser(input);
  }

  @Mutation(() => SupplierPayment)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createSupplierPayment(@Args('input') input: CreateSupplierPaymentInput) {
    return this.purchaseService.createSupplierPayment(input);
  }

  // Requisition & RFQ (scaffolded)
  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createPurchaseRequisition(
    @Args('input') input: CreatePurchaseRequisitionInput,
  ) {
    return this.purchaseService.createPurchaseRequisition(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  submitPurchaseRequisition(@Args('input') input: IdInput) {
    return this.purchaseService.submitPurchaseRequisition(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  approvePurchaseRequisition(@Args('input') input: IdInput) {
    return this.purchaseService.approvePurchaseRequisition(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  rejectPurchaseRequisition(
    @Args('input') input: RejectRequisitionInput,
  ) {
    return this.purchaseService.rejectPurchaseRequisition(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  issueRFQ(@Args('input') input: IssueRfqInput) {
    return this.purchaseService.issueRFQ(input);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  submitSupplierQuote(@Args('input') input: SubmitSupplierQuoteInput) {
    return this.purchaseService.submitSupplierQuote(input);
  }

  @Mutation(() => [String])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  createPOsFromSelection(@Args('input') input: CreatePOsFromSelectionInput) {
    return this.purchaseService.createPOsFromSelection(input);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  updatePurchaseOrderPhase(
    @Args('input') input: UpdatePurchaseOrderPhaseInput,
  ) {
    return this.purchaseService.updatePurchaseOrderPhase(input);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  markPurchaseOrderReceived(
    @Args('input') input: MarkPurchaseOrderReceivedInput,
  ) {
    return this.purchaseService.markPurchaseOrderReceived(input);
  }
}
