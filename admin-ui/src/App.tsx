import { Box } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
const Login = lazy(() => import('./pages/Login'));
const Outbox = lazy(() => import('./pages/Outbox'));
const LowStock = lazy(() => import('./pages/LowStock'));
const Fulfillments = lazy(() => import('./pages/Fulfillments'));
const FulfillmentDetail = lazy(() => import('./pages/FulfillmentDetail'));
import ProtectedRoute from './shared/ProtectedRoute';
import IndexRedirect from './pages/IndexRedirect';
const Profile = lazy(() => import('./pages/Profile'));
const Signup = lazy(() => import('./pages/Signup'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const ApplyReseller = lazy(() => import('./pages/ApplyReseller'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Requisitions = lazy(() => import('./pages/Requisitions'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const PurchaseOrderDetail = lazy(() => import('./pages/PurchaseOrderDetail'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Stock = lazy(() => import('./pages/Stock'));
const Users = lazy(() => import('./pages/Users'));
const Payments = lazy(() => import('./pages/Payments'));
const Returns = lazy(() => import('./pages/Returns'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Stores = lazy(() => import('./pages/Stores'));
const Support = lazy(() => import('./pages/Support'));
const Staff = lazy(() => import('./pages/Staff'));
const StaffDetail = lazy(() => import('./pages/StaffDetail'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ReceiveStock = lazy(() => import('./pages/ReceiveStock'));
const SupplierPayments = lazy(() => import('./pages/SupplierPayments'));
const SupplierAging = lazy(() => import('./pages/SupplierAging'));
const SupplierStatement = lazy(() => import('./pages/SupplierStatement'));
import NotFound from './pages/NotFound';
const Forbidden = lazy(() => import('./pages/Forbidden'));
import SidebarLayout from './shared/SidebarLayout';
import Loading from './shared/Loading';
import ErrorBoundary from './shared/ErrorBoundary';
const ResellerApprovals = lazy(() => import('./pages/ResellerApprovals'));
const Resellers = lazy(() => import('./pages/Resellers'));
const ResellerDetail = lazy(() => import('./pages/ResellerDetail'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const InvoiceIngest = lazy(() => import('./pages/InvoiceIngest'));
const InvoiceImports = lazy(() => import('./pages/InvoiceImports'));
const InvoiceImportDetail = lazy(() => import('./pages/InvoiceImportDetail'));
const Variants = lazy(() => import('./pages/Variants'));
const VariantDetail = lazy(() => import('./pages/VariantDetail'));
const VariantImport = lazy(() => import('./pages/VariantImport'));
const DevDbTools = lazy(() => import('./pages/DevDbTools'));
const Facets = lazy(() => import('./pages/Facets'));
const Collections = lazy(() => import('./pages/Collections'));
const Roles = lazy(() => import('./pages/Roles'));
const Assets = lazy(() => import('./pages/Assets'));
const RequisitionDetail = lazy(() => import('./pages/RequisitionDetail'));
const Orders = lazy(() => import('./pages/Orders'));
const OrdersQuotations = lazy(() => import('./pages/OrdersQuotations'));
const OrdersSales = lazy(() => import('./pages/OrdersSales'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const OrdersQuotationDetail = lazy(() => import('./pages/OrdersQuotationDetail'));
const OrdersSaleDetail = lazy(() => import('./pages/OrdersSaleDetail'));
const OrdersQuotationCreate = lazy(() => import('./pages/OrdersQuotationCreate'));
const OrdersQuotationEdit = lazy(() => import('./pages/OrdersQuotationEdit'));
const CustomerSales = lazy(() => import('./pages/CustomerSales'));
const ResellerSalesPage = lazy(() => import('./pages/ResellerSalesPage'));
const Addresses = lazy(() => import('./pages/Addresses'));
const Riders = lazy(() => import('./pages/Riders'));
import { PERMISSIONS, permissionList } from './shared/permissions';

export default function App() {
  const analyticsReadAccess = permissionList(PERMISSIONS.analytics.READ);
  const productReadAccess = permissionList(PERMISSIONS.product.READ);
  const productWriteAccess = permissionList(
    PERMISSIONS.product.CREATE,
    PERMISSIONS.product.UPDATE,
    PERMISSIONS.product.DELETE,
  );
  const userManageAccess = permissionList(
    PERMISSIONS.user.CREATE,
    PERMISSIONS.user.READ,
    PERMISSIONS.user.UPDATE,
    PERMISSIONS.user.DELETE,
  );
  const resellerApprovalAccess = permissionList(
    PERMISSIONS.resellerProfile.APPROVE,
  );
  const assignmentAccess = permissionList(
    PERMISSIONS.store.UPDATE,
    PERMISSIONS.resellerProfile.UPDATE,
  );
  const orderReadAccess = permissionList(PERMISSIONS.order.READ);
  const saleReadAccess = permissionList(PERMISSIONS.sale.READ);
  const staffManageAccess = permissionList(
    PERMISSIONS.staff.CREATE,
    PERMISSIONS.store.UPDATE,
    PERMISSIONS.resellerProfile.UPDATE,
  );
  const roleManageAccess = permissionList(
    PERMISSIONS.role.READ,
    PERMISSIONS.role.CREATE,
    PERMISSIONS.role.UPDATE,
    PERMISSIONS.role.DELETE,
  );
  const addressReadAccess = permissionList(PERMISSIONS.address.READ);
  const fulfillmentAccess = permissionList(PERMISSIONS.sale.UPDATE);

  return (
    <Box>
      <SidebarLayout>
        <ErrorBoundary>
          <Suspense fallback={<Loading />}>
            <Routes>
            <Route path="/" element={<IndexRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/apply-reseller" element={<ApplyReseller />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/complete-profile" element={<ProtectedRoute element={<CompleteProfile />} />} />
            <Route
              path="/outbox"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT']}
                  perms={analyticsReadAccess}
                  element={<Outbox />}
                />
              }
            />
            <Route
              path="/low-stock"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={[...productReadAccess, ...analyticsReadAccess]}
                  element={<LowStock />}
                />
              }
            />
            <Route
              path="/fulfillments"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'ACCOUNTANT',
                    'BILLER',
                    'RIDER',
                  ]}
                  perms={[...fulfillmentAccess, ...orderReadAccess]}
                  element={<Fulfillments />}
                />
              }
            />
            <Route
              path="/fulfillments/:saleOrderId"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'ACCOUNTANT',
                    'BILLER',
                    'RIDER',
                  ]}
                  perms={[...orderReadAccess, ...fulfillmentAccess]}
                  element={<FulfillmentDetail />}
                />
              }
            />
            <Route
              path="/profile"
              element={<ProtectedRoute element={<Profile />} />}
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<Suppliers />}
                />
              }
            />
            <Route
              path="/requisitions"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<Requisitions />}
                />
              }
            />
            <Route
              path="/purchase-orders"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<PurchaseOrders />}
                />
              }
            />
            <Route
              path="/purchase-orders/:id"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<PurchaseOrderDetail />}
                />
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={[...productReadAccess, ...productWriteAccess]}
                  element={<Products />}
                />
              }
            />
            <Route path="/variants" element={<Variants />} />
            <Route
              path="/orders"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                    'RESELLER',
                  ]}
                  perms={orderReadAccess}
                  element={<Orders />}
                />
              }
            />
            <Route
              path="/orders/quotations"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                    'RESELLER',
                  ]}
                  perms={orderReadAccess}
                  element={<OrdersQuotations />}
                />
              }
            />
            <Route
              path="/orders/quotations/customer"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                  ]}
                  perms={orderReadAccess}
                  element={<OrdersQuotations type="CONSUMER" />}
                />
              }
            />
            <Route
              path="/orders/quotations/reseller"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                    'RESELLER',
                  ]}
                  perms={orderReadAccess}
                  element={<OrdersQuotations type="RESELLER" />}
                />
              }
            />
            <Route
              path="/orders/quotations/new"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                    'RESELLER',
                  ]}
                  perms={orderReadAccess}
                  element={<OrdersQuotationCreate />}
                />
              }
            />
            <Route
              path="/orders/quotations/:id"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                    'RESELLER',
                  ]}
                  perms={orderReadAccess}
                  element={<OrdersQuotationDetail />}
                />
              }
            />
            <Route
              path="/orders/quotations/:id/edit"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                    'RESELLER',
                  ]}
                  perms={orderReadAccess}
                  element={<OrdersQuotationEdit />}
                />
              }
            />
            <Route
              path="/orders/sales"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                    'RESELLER',
                  ]}
                  perms={[...orderReadAccess, ...saleReadAccess]}
                  element={<OrdersSales />}
                />
              }
            />
            <Route
              path="/orders/sales/:kind/:id"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                    'RESELLER',
                  ]}
                  perms={orderReadAccess}
                  element={<OrdersSaleDetail />}
                />
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute
                  roles={[
                    'SUPERADMIN',
                    'ADMIN',
                    'MANAGER',
                    'BILLER',
                    'ACCOUNTANT',
                    'RESELLER',
                  ]}
                  perms={orderReadAccess}
                  element={<OrderDetail />}
                />
              }
            />
            <Route
              path="/assets"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={productWriteAccess}
                  element={<Assets />}
                />
              }
            />
            <Route
              path="/variants/import"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={productWriteAccess}
                  element={<VariantImport />}
                />
              }
            />
            <Route path="/variants/:id" element={<VariantDetail />} />
            <Route
              path="/dev/db-tools"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN']}
                  element={<DevDbTools />}
                />
              }
            />
            <Route
              path="/facets"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={productWriteAccess}
                  element={<Facets />}
                />
              }
            />
            <Route
              path="/collections"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={productWriteAccess}
                  element={<Collections />}
                />
              }
            />
            <Route
              path="/invoice-ingest"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<InvoiceIngest />}
                />
              }
            />
            <Route
              path="/invoice-imports"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<InvoiceImports />}
                />
              }
            />
            <Route
              path="/invoice-imports/:id"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<InvoiceImportDetail />}
                />
              }
            />
            <Route
              path="/requisitions/:id"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<RequisitionDetail />}
                />
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={[...productReadAccess, ...productWriteAccess]}
                  element={<ProductDetail />}
                />
              }
            />
            <Route
              path="/stock"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<Stock />}
                />
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN']}
                  perms={userManageAccess}
                  element={<Users />}
                />
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN']}
                  perms={userManageAccess}
                  element={<Customers />}
                />
              }
            />
            <Route
              path="/customers/sales"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'ACCOUNTANT']}
                  perms={[...orderReadAccess, ...saleReadAccess]}
                  element={<CustomerSales />}
                />
              }
            />
            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN']}
                  perms={userManageAccess}
                  element={<CustomerDetail />}
                />
              }
            />
            <Route
              path="/resellers"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<Resellers />}
                />
              }
            />
            <Route
              path="/resellers/sales"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'ACCOUNTANT']}
                  perms={[...orderReadAccess, ...saleReadAccess]}
                  element={<ResellerSalesPage />}
                />
              }
            />
            <Route
              path="/resellers/:id"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<ResellerDetail />}
                />
              }
            />
            <Route
              path="/reseller-approvals"
              element={
                <ProtectedRoute
                  perms={resellerApprovalAccess}
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<ResellerApprovals />}
                />
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT']}
                  element={<Payments />}
                />
              }
            />
            <Route
              path="/returns"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<Returns />}
                />
              }
            />
            <Route path="*" element={<NotFound />} />
            <Route path="/forbidden" element={<Forbidden />} />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT']}
                  perms={analyticsReadAccess}
                  element={<Analytics />}
                />
              }
            />
            <Route
              path="/stores"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<Stores />}
                />
              }
            />
            <Route
              path="/addresses"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={addressReadAccess}
                  element={<Addresses />}
                />
              }
            />
            <Route
              path="/riders"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={fulfillmentAccess}
                  element={<Riders />}
                />
              }
            />
            <Route
              path="/support"
              element={<ProtectedRoute element={<Support />} />}
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN']}
                  perms={staffManageAccess}
                  element={<Staff />}
                />
              }
            />
            <Route
              path="/staff/:id"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN']}
                  perms={staffManageAccess}
                  element={<StaffDetail />}
                />
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN']}
                  perms={roleManageAccess}
                  element={<Roles />}
                />
              }
            />
            <Route
              path="/receive-stock"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  element={<ReceiveStock />}
                />
              }
            />
            <Route
              path="/supplier-payments"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT']}
                  element={<SupplierPayments />}
                />
              }
            />
            <Route
              path="/supplier-aging"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT']}
                  element={<SupplierAging />}
                />
              }
            />
            <Route
              path="/supplier-statements"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT']}
                  element={<SupplierStatement />}
                />
              }
            />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </SidebarLayout>
    </Box>
  );
}
