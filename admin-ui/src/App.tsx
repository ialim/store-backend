import { Box } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
const Login = lazy(() => import('./pages/Login'));
const Outbox = lazy(() => import('./pages/Outbox'));
const LowStock = lazy(() => import('./pages/LowStock'));
const Fulfillment = lazy(() => import('./pages/Fulfillment'));
import ProtectedRoute from './shared/ProtectedRoute';
import IndexRedirect from './pages/IndexRedirect';
const Profile = lazy(() => import('./pages/Profile'));
const Signup = lazy(() => import('./pages/Signup'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const ApplyReseller = lazy(() => import('./pages/ApplyReseller'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
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
const ReceiveStock = lazy(() => import('./pages/ReceiveStock'));
const SupplierPayments = lazy(() => import('./pages/SupplierPayments'));
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
const DevDbTools = lazy(() => import('./pages/DevDbTools'));
const Facets = lazy(() => import('./pages/Facets'));

export default function App() {
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
            <Route path="/complete-profile" element={<ProtectedRoute element={<CompleteProfile />} />} />
            <Route
              path="/outbox"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT']}
                  perms={['VIEW_REPORTS']}
                  element={<Outbox />}
                />
              }
            />
            <Route
              path="/low-stock"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={['MANAGE_PRODUCTS', 'VIEW_REPORTS']}
                  element={<LowStock />}
                />
              }
            />
            <Route
              path="/fulfillment"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER']}
                  perms={['ASSIGN_MANAGER', 'ASSIGN_BILLER']}
                  element={<Fulfillment />}
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
                  perms={['MANAGE_PRODUCTS']}
                  element={<Products />}
                />
              }
            />
            <Route path="/variants" element={<Variants />} />
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
                  perms={['MANAGE_PRODUCTS']}
                  element={<Facets />}
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
              path="/products/:id"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN', 'MANAGER']}
                  perms={['MANAGE_PRODUCTS']}
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
                  perms={['MANAGE_USERS']}
                  element={<Users />}
                />
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN']}
                  perms={['MANAGE_USERS']}
                  element={<Customers />}
                />
              }
            />
            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN']}
                  perms={['MANAGE_USERS']}
                  element={<CustomerDetail />}
                />
              }
            />
            <Route
              path="/resellers"
              element={<ProtectedRoute roles={['SUPERADMIN','ADMIN','MANAGER']} element={<Resellers />} />}
            />
            <Route
              path="/resellers/:id"
              element={<ProtectedRoute roles={['SUPERADMIN','ADMIN','MANAGER']} element={<ResellerDetail />} />}
            />
            <Route
              path="/reseller-approvals"
              element={
                <ProtectedRoute
                  perms={['APPROVE_RESELLER']}
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
                  perms={['VIEW_REPORTS']}
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
              path="/support"
              element={<ProtectedRoute element={<Support />} />}
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute
                  roles={['SUPERADMIN', 'ADMIN']}
                  perms={['CREATE_STAFF', 'ASSIGN_MANAGER', 'ASSIGN_BILLER']}
                  element={<Staff />}
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
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </SidebarLayout>
    </Box>
  );
}
