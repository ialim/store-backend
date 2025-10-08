import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
import {
  Supplier,
  FindManySupplierArgs,
} from '../../shared/prismagraphql/supplier';
import { PurchaseOrder } from '../../shared/prismagraphql/purchase-order';
import { SupplierPayment } from '../../shared/prismagraphql/supplier-payment';
import { PurchaseService } from './purchase.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateSupplierInput } from './dto/create-supplier.input';
import { UpdateSupplierInput } from './dto/update-supplier.input';
import { CreatePurchaseOrderInput } from './dto/create-purchase-order.input';
import { UpdatePurchaseOrderStatusInput } from './dto/update-purchase-order-status.input';
import { CreateSupplierPaymentInput } from './dto/create-supplier-payment.input';
import { LinkSupplierUserInput } from './dto/link-supplier-user.input';
import { CreatePOsFromSelectionInput } from './dto/create-pos-from-selection.input';
import { CreatePurchaseRequisitionInput } from './dto/create-purchase-requisition.input';
import {
  IdInput,
  RejectRequisitionInput,
} from './dto/submit-purchase-requisition.input';
import { IssueRfqInput } from './dto/issue-rfq.input';
import { SubmitSupplierQuoteInput } from './dto/submit-supplier-quote.input';
import {
  SelectSupplierQuoteInput,
  RejectSupplierQuoteInput,
} from './dto/select-reject-supplier-quote.input';
import {
  MarkPurchaseOrderReceivedInput,
  UpdatePurchaseOrderPhaseInput,
} from './dto/update-po-phase.input';
import { RequisitionSummary } from './types/requisition-summary.type';
import { SupplierQuoteSummary } from './types/supplier-quote-summary.type';
import { SupplierCatalogEntry } from './types/supplier-catalog-entry.type';
import { RfqStatusCounts } from './types/rfq-status-counts.type';
import { RfqDashboard } from './types/rfq-dashboard.type';
import { AdminProcurementDashboard } from './types/admin-procurement-dashboard.type';
import {
  UpsertSupplierCatalogBulkInput,
  UpsertSupplierCatalogInput,
} from './dto/upsert-supplier-catalog.input';
import { CloseRfqInput } from './dto/close-rfq.input';
import { CreateRequisitionFromLowStockInput } from './dto/create-requisition-from-low-stock.input';
import { PurchaseOrderStatus } from '../../shared/prismagraphql/prisma/purchase-order-status.enum';
import { PurchasePhase } from '../../shared/prismagraphql/prisma/purchase-phase.enum';
import { LowStockCandidate } from './types/low-stock-candidate.type';
import { LowStockSchedulerService } from './low-stock-scheduler.service';
import { PurchaseOrderReceiptProgress } from './types/purchase-order-receipt-progress.type';

@Resolver()
export class PurchaseResolver {
  constructor(
    private readonly purchaseService: PurchaseService,
    private readonly lowStock: LowStockSchedulerService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [Supplier])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  suppliers() {
    return this.purchaseService.suppliers();
  }

  @Query(() => [Supplier])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  listSuppliers(@Args() args: FindManySupplierArgs) {
    // Mirror of listUsers/listStores pattern for server-side search
    return this.prisma.supplier.findMany(
      args as unknown as Prisma.SupplierFindManyArgs,
    );
  }

  @Query(() => Supplier)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  supplier(@Args('id') id: string) {
    return this.purchaseService.supplier(id);
  }

  @Mutation(() => Supplier)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.CREATE as string)
  createSupplier(@Args('input') input: CreateSupplierInput) {
    return this.purchaseService.createSupplier(input);
  }

  @Mutation(() => Supplier)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  updateSupplier(@Args('input') input: UpdateSupplierInput) {
    return this.purchaseService.updateSupplier(input);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrders(
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.purchaseService.purchaseOrders(take, skip);
  }

  @Query(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrder(@Args('id') id: string) {
    return this.purchaseService.purchaseOrder(id);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.CREATE as string)
  createPurchaseOrder(@Args('input') input: CreatePurchaseOrderInput) {
    return this.purchaseService.createPurchaseOrder(input);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  updatePurchaseOrderStatus(
    @Args('input') input: UpdatePurchaseOrderStatusInput,
  ) {
    return this.purchaseService.updatePurchaseOrderStatus(input);
  }

  @Query(() => [SupplierPayment])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  supplierPayments() {
    return this.purchaseService.supplierPayments();
  }

  @Query(() => [SupplierPayment])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  supplierPaymentsBySupplier(@Args('supplierId') supplierId: string) {
    return this.purchaseService.supplierPaymentsBySupplier(supplierId);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersByStatus(
    @Args('status') status: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.purchaseService.purchaseOrdersByStatus(status, take, skip);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersByStatusEnum(
    @Args('status', { type: () => PurchaseOrderStatus })
    status: PurchaseOrderStatus,
  ) {
    return this.purchaseService.purchaseOrdersByStatus(
      status as unknown as string,
    );
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersByPhase(
    @Args('phase') phase: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.purchaseService.purchaseOrdersByPhase(phase, take, skip);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersBySupplier(
    @Args('supplierId') supplierId: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.purchaseService.purchaseOrdersBySupplier(
      supplierId,
      take,
      skip,
    );
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  issueRFQPreferred(@Args('requisitionId') requisitionId: string) {
    return this.purchaseService.issueRFQPreferred(requisitionId);
  }

  @Query(() => Int)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersCount(
    @Args('status', { nullable: true }) status?: string,
    @Args('phase', { nullable: true }) phase?: string,
  ) {
    return this.purchaseService.purchaseOrdersCount(status, phase);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersByPhaseEnum(
    @Args('phase', { type: () => PurchasePhase }) phase: PurchasePhase,
  ) {
    return this.purchaseService.purchaseOrdersByPhase(
      phase as unknown as string,
    );
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersOverdue() {
    return this.purchaseService.purchaseOrdersOverdue();
  }

  @Query(() => [RequisitionSummary])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  requisitionsByStatus(
    @Args('status') status: string,
    @Args('storeId', { nullable: true }) storeId?: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.purchaseService.requisitionsByStatus(
      status,
      storeId || undefined,
      take,
      skip,
    );
  }

  @Query(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  requisitionsCountByStatus(
    @Args('status') status: string,
    @Args('storeId', { nullable: true }) storeId?: string,
  ) {
    return this.purchaseService.requisitionsCountByStatus(
      status,
      storeId || undefined,
    );
  }

  @Query(() => [RequisitionSummary])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  requisitionsByStore(
    @Args('storeId') storeId: string,
    @Args('status', { nullable: true }) status?: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.purchaseService.requisitionsByStore(
      storeId,
      status,
      take,
      skip,
    );
  }

  @Query(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  requisitionsCountByStore(
    @Args('storeId') storeId: string,
    @Args('status', { nullable: true }) status?: string,
  ) {
    return this.purchaseService.requisitionsCountByStore(storeId, status);
  }

  @Query(() => [SupplierQuoteSummary])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  supplierQuotesByRequisition(@Args('requisitionId') requisitionId: string) {
    return this.purchaseService.supplierQuotesByRequisition(requisitionId);
  }

  @Query(() => RequisitionSummary, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseRequisitionSummary(@Args('id') id: string) {
    return this.purchaseService.requisitionSummary(id);
  }

  // Supplier Catalog
  @Mutation(() => SupplierCatalogEntry)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  upsertSupplierCatalog(@Args('input') input: UpsertSupplierCatalogInput) {
    return this.purchaseService.upsertSupplierCatalog(input);
  }

  @Mutation(() => [String])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  upsertSupplierCatalogBulk(
    @Args('input') input: UpsertSupplierCatalogBulkInput,
  ) {
    return this.purchaseService.upsertSupplierCatalogBulk(input);
  }

  @Query(() => [SupplierCatalogEntry])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  supplierCatalogBySupplier(@Args('supplierId') supplierId: string) {
    return this.purchaseService.supplierCatalogBySupplier(supplierId);
  }

  @Query(() => [SupplierCatalogEntry])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  supplierCatalogByVariant(@Args('productVariantId') productVariantId: string) {
    return this.purchaseService.supplierCatalogByVariant(productVariantId);
  }

  // RFQ gaps
  @Query(() => [RequisitionSummary])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  requisitionsWithNoSubmittedQuotes() {
    return this.purchaseService.requisitionsWithNoSubmittedQuotes();
  }

  @Query(() => [SupplierQuoteSummary])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  rfqPendingSuppliers(@Args('requisitionId') requisitionId: string) {
    return this.purchaseService.rfqPendingSuppliers(requisitionId);
  }

  @Query(() => [RequisitionSummary])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  requisitionsWithPartialSubmissions() {
    return this.purchaseService.requisitionsWithPartialSubmissions();
  }

  @Query(() => RfqStatusCounts)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  rfqStatusCounts(@Args('requisitionId') requisitionId: string) {
    return this.purchaseService.rfqStatusCounts(requisitionId);
  }

  @Query(() => RfqStatusCounts)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  rfqCountsAll() {
    return this.purchaseService.rfqCountsAll();
  }

  @Query(() => RfqDashboard)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  rfqDashboard(@Args('requisitionId') requisitionId: string) {
    return this.purchaseService.rfqDashboard(requisitionId);
  }

  @Query(() => RfqDashboard)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  rfqDashboardAll() {
    return this.purchaseService.rfqDashboardAll();
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.APPROVE as string)
  selectSupplierQuote(@Args('input') input: SelectSupplierQuoteInput) {
    return this.purchaseService.selectSupplierQuote(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.APPROVE as string)
  rejectSupplierQuote(@Args('input') input: RejectSupplierQuoteInput) {
    return this.purchaseService.rejectSupplierQuote(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  closeRFQ(@Args('input') input: CloseRfqInput) {
    return this.purchaseService.closeRFQ(input);
  }

  // Low-stock helpers
  @Query(() => [LowStockCandidate])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  async lowStockCandidates(
    @Args('storeId', { nullable: true }) storeId?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.purchaseService.getLowStockCandidates(storeId, limit ?? 500);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  async runLowStockScanNow() {
    await this.lowStock.handleInterval();
    return true;
  }

  @Query(() => String, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  async lastAutoRequisitionIdByStore(@Args('storeId') storeId: string) {
    return this.purchaseService.getLastAutoRequisitionIdByStore(storeId);
  }

  @Mutation(() => Supplier)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  linkSupplierUser(@Args('input') input: LinkSupplierUserInput) {
    return this.purchaseService.linkSupplierUser(input);
  }

  @Mutation(() => SupplierPayment)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.CREATE as string)
  createSupplierPayment(@Args('input') input: CreateSupplierPaymentInput) {
    return this.purchaseService.createSupplierPayment(input);
  }

  // Requisition & RFQ (scaffolded)
  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.CREATE as string)
  createPurchaseRequisition(
    @Args('input') input: CreatePurchaseRequisitionInput,
  ) {
    return this.purchaseService.createPurchaseRequisition(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  submitPurchaseRequisition(@Args('input') input: IdInput) {
    return this.purchaseService.submitPurchaseRequisition(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.APPROVE as string)
  approvePurchaseRequisition(@Args('input') input: IdInput) {
    return this.purchaseService.approvePurchaseRequisition(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.APPROVE as string)
  rejectPurchaseRequisition(@Args('input') input: RejectRequisitionInput) {
    return this.purchaseService.rejectPurchaseRequisition(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  issueRFQ(@Args('input') input: IssueRfqInput) {
    return this.purchaseService.issueRFQ(input);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  submitSupplierQuote(@Args('input') input: SubmitSupplierQuoteInput) {
    return this.purchaseService.submitSupplierQuote(input);
  }

  @Mutation(() => [String])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.CREATE as string)
  createPOsFromSelection(@Args('input') input: CreatePOsFromSelectionInput) {
    return this.purchaseService.createPOsFromSelection(input);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  updatePurchaseOrderPhase(
    @Args('input') input: UpdatePurchaseOrderPhaseInput,
  ) {
    return this.purchaseService.updatePurchaseOrderPhase(input);
  }

  @Mutation(() => PurchaseOrder)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.UPDATE as string)
  markPurchaseOrderReceived(
    @Args('input') input: MarkPurchaseOrderReceivedInput,
  ) {
    return this.purchaseService.markPurchaseOrderReceived(input);
  }
  @Query(() => AdminProcurementDashboard)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  adminProcurementDashboard() {
    return this.purchaseService.adminProcurementDashboard();
  }

  // Store-scoped dashboards
  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersOverdueByStore(@Args('storeId') storeId: string) {
    return this.purchaseService.purchaseOrdersOverdueByStore(storeId);
  }

  @Query(() => [PurchaseOrderReceiptProgress])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrderReceiptProgress(
    @Args('purchaseOrderId') purchaseOrderId: string,
  ) {
    return this.purchaseService.purchaseOrderReceiptProgress(purchaseOrderId);
  }

  @Query(() => [PurchaseOrder])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersSearch(
    @Args('q') q: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.purchaseService.purchaseOrdersSearch(q, take, skip);
  }

  @Query(() => Int)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.purchase.READ as string)
  purchaseOrdersSearchCount(@Args('q') q: string) {
    return this.purchaseService.purchaseOrdersSearchCount(q);
  }

  @Query(() => [RequisitionSummary])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  requisitionsWithNoSubmittedQuotesByStore(@Args('storeId') storeId: string) {
    return this.purchaseService.requisitionsWithNoSubmittedQuotesByStore(
      storeId,
    );
  }

  @Query(() => [RequisitionSummary])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  requisitionsWithPartialSubmissionsByStore(@Args('storeId') storeId: string) {
    return this.purchaseService.requisitionsWithPartialSubmissionsByStore(
      storeId,
    );
  }

  @Query(() => RfqStatusCounts)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  rfqStatusCountsByStore(@Args('storeId') storeId: string) {
    return this.purchaseService.rfqStatusCountsByStore(storeId);
  }

  @Query(() => RfqDashboard)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  rfqDashboardByStore(@Args('storeId') storeId: string) {
    return this.purchaseService.rfqDashboardByStore(storeId);
  }

  @Query(() => AdminProcurementDashboard)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.READ as string)
  adminProcurementDashboardByStore(@Args('storeId') storeId: string) {
    return this.purchaseService.adminProcurementDashboardByStore(storeId);
  }

  @Mutation(() => String, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.CREATE as string)
  createRequisitionFromLowStock(
    @Args('input') input: CreateRequisitionFromLowStockInput,
  ) {
    return this.purchaseService.createRequisitionFromLowStock(input);
  }

  @Mutation(() => String, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.purchase.CREATE as string)
  createLowStockRequisitionAndIssuePreferred(
    @Args('input') input: CreateRequisitionFromLowStockInput,
  ) {
    return this.purchaseService.createLowStockRequisitionAndIssuePreferred(
      input,
    );
  }
}
