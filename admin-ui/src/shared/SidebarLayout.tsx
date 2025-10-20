import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Collapse,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import StoreIcon from '@mui/icons-material/Store';
import PlaceIcon from '@mui/icons-material/Place';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PaidIcon from '@mui/icons-material/Paid';
import UndoIcon from '@mui/icons-material/Undo';
import AssignmentReturnedIcon from '@mui/icons-material/AssignmentReturned';
import InsightsIcon from '@mui/icons-material/Insights';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useAuth } from './AuthProvider';
import { notify } from './notify';
import {
  useHeaderNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMeQuery,
} from '../generated/graphql';
import { PERMISSIONS, permissionList } from './permissions';

const drawerWidth = 272;

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { token, user, logout, hasRole, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const { data: meData } = useMeQuery({ skip: !token, fetchPolicy: 'cache-and-network' as any });
  const [notificationsAnchorEl, setNotificationsAnchorEl] = React.useState<HTMLElement | null>(null);
  const notificationsOpen = Boolean(notificationsAnchorEl);
  const [markNotificationAsReadMutation] = useMarkNotificationAsReadMutation();

  const analyticsRead = permissionList(PERMISSIONS.analytics.READ);
  const assignmentAccess = permissionList(
    PERMISSIONS.store.UPDATE,
    PERMISSIONS.resellerProfile.UPDATE,
  );
  const productRead = permissionList(PERMISSIONS.product.READ);
  const productWrite = permissionList(
    PERMISSIONS.product.CREATE,
    PERMISSIONS.product.UPDATE,
    PERMISSIONS.product.DELETE,
  );
  const assetRead = permissionList(PERMISSIONS.asset.READ);
  const orderRead = permissionList(PERMISSIONS.order.READ);
  const saleRead = permissionList(PERMISSIONS.sale.READ);
  const userManage = permissionList(
    PERMISSIONS.user.CREATE,
    PERMISSIONS.user.READ,
    PERMISSIONS.user.UPDATE,
    PERMISSIONS.user.DELETE,
  );
  const resellerApprove = permissionList(PERMISSIONS.resellerProfile.APPROVE);
  const roleManage = permissionList(
    PERMISSIONS.role.READ,
    PERMISSIONS.role.CREATE,
    PERMISSIONS.role.UPDATE,
    PERMISSIONS.role.DELETE,
  );
  const addressRead = permissionList(PERMISSIONS.address.READ);
  const fulfillmentAccess = permissionList(PERMISSIONS.sale.UPDATE);
  const isRider = hasRole('RIDER');
  const isBiller = hasRole('BILLER');
  const isReseller = hasRole('RESELLER');

  type NavSection = {
    key: string;
    label: string;
    items: {
      label: string;
      to: string;
      show: boolean;
      icon: React.ReactNode;
    }[];
    collapsible?: boolean;
  };

  const toggleMobileDrawer = () => setMobileOpen((prev) => !prev);
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});

  const toggleSectionCollapse = React.useCallback((key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleNotificationsButtonClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.currentTarget;
      setNotificationsAnchorEl((current) => (current ? null : target));
    },
    [],
  );

  const handleCloseNotifications = React.useCallback(() => {
    setNotificationsAnchorEl(null);
  }, []);

  const handleNotificationItemClick = React.useCallback(
    async (notificationId: string, isRead: boolean) => {
      if (isRead) return;
      try {
        await markNotificationAsReadMutation({
          variables: { id: notificationId },
          optimisticResponse: {
            markAsRead: {
              __typename: 'Notification',
              id: notificationId,
              isRead: true,
            },
          },
          update: (cache, { data }) => {
            const updated = data?.markAsRead;
            if (!updated) return;
            const cacheId = cache.identify({
              __typename: 'Notification',
              id: updated.id,
            });
            if (cacheId) {
              cache.modify({
                id: cacheId,
                fields: {
                  isRead: () => true,
                },
              });
            }
          },
        });
      } catch (error) {
        console.error('Failed to mark notification as read', error);
      }
    },
    [markNotificationAsReadMutation],
  );

  const formatNotificationTimestamp = React.useCallback((value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60_000) return 'Just now';
    if (diffMs < 3_600_000) {
      const mins = Math.floor(diffMs / 60_000);
      return `${mins} min${mins === 1 ? '' : 's'} ago`;
    }
    if (diffMs < 86_400_000) {
      const hours = Math.floor(diffMs / 3_600_000);
      return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    }
    return date.toLocaleString();
  }, []);

  const defaultSections: NavSection[] = [
    {
      key: 'catalog',
      label: 'Catalog & Stock',
      collapsible: true,
      items: [
        {
          label: 'Products',
          to: '/products',
          show:
            !isRider &&
            (hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') ||
              hasPermission(...productRead, ...productWrite)),
          icon: <Inventory2Icon fontSize="small" />,
        },
        {
          label: 'Variants',
          to: '/variants',
          show: !isRider,
          icon: <Inventory2Icon fontSize="small" />,
        },
        {
          label: 'Import Variants',
          to: '/variants/import',
          show:
            !isRider &&
            (hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') ||
              hasPermission(...productWrite)),
          icon: <CloudUploadIcon fontSize="small" />,
        },
        {
          label: 'Assets',
          to: '/assets',
          show:
            !isRider &&
            !isBiller &&
            (hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') ||
              hasPermission(...assetRead)),
          icon: <PhotoLibraryIcon fontSize="small" />,
        },
        {
          label: 'Collections',
          to: '/collections',
          show:
            !isRider &&
            (hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') ||
              hasPermission(...productWrite)),
          icon: <AssignmentIcon fontSize="small" />,
        },
        {
          label: 'Facets',
          to: '/facets',
          show:
            !isRider &&
            (hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') ||
              hasPermission(...productWrite)),
          icon: <AssignmentIcon fontSize="small" />,
        },
        {
          label: 'Stock',
          to: '/stock',
          show:
            !isRider &&
            (hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER') ||
              hasPermission(...productRead)),
          icon: <Inventory2Icon fontSize="small" />,
        },
        {
          label: 'Stores',
          to: '/stores',
          show: !isRider && hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <StoreIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'orders',
      label: 'Orders',
      collapsible: true,
      items: [
        {
          label: 'Orders',
          to: '/orders',
          show:
            hasRole(
              'SUPERADMIN',
              'ADMIN',
              'MANAGER',
              'ACCOUNTANT',
              'RESELLER',
              'BILLER',
            ) || hasPermission(...orderRead, ...saleRead),
          icon: <ReceiptLongIcon fontSize="small" />,
        },
        {
          label: 'Quotations',
          to: '/orders/quotations',
          show:
            hasRole(
              'SUPERADMIN',
              'ADMIN',
              'MANAGER',
              'ACCOUNTANT',
              'RESELLER',
              'BILLER',
            ) || hasPermission(...orderRead, ...saleRead),
          icon: <AssignmentIcon fontSize="small" />,
        },
        {
          label: 'Sales',
          to: '/orders/sales',
          show:
            hasRole(
              'SUPERADMIN',
              'ADMIN',
              'MANAGER',
              'ACCOUNTANT',
              'RESELLER',
              'BILLER',
            ) || hasPermission(...orderRead, ...saleRead),
          icon: <LocalMallIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'proc',
      label: 'Procurement',
      collapsible: true,
      items: [
        {
          label: 'Requisitions',
          to: '/requisitions',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <AssignmentIcon fontSize="small" />,
        },
        {
          label: 'Purchase Orders',
          to: '/purchase-orders',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <AssignmentIcon fontSize="small" />,
        },
        {
          label: 'Receive Stock',
          to: '/receive-stock',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <Inventory2Icon fontSize="small" />,
        },
        {
          label: 'Invoice Ingest',
          to: '/invoice-ingest',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <AssignmentIcon fontSize="small" />,
        },
        {
          label: 'Invoice Imports',
          to: '/invoice-imports',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <AssignmentIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'fulfillment',
      label: 'Fulfillment',
      collapsible: true,
      items: [
        {
          label: 'Fulfillments',
          to: '/fulfillments',
          show:
            hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'ACCOUNTANT', 'RIDER') ||
            hasPermission(...fulfillmentAccess),
          icon: <LocalShippingIcon fontSize="small" />,
        },
        {
          label: 'My Fulfillments',
          to: '/fulfillments/my',
          show: isRider,
          icon: <DeliveryDiningIcon fontSize="small" />,
        },
        {
          label: 'Addresses',
          to: '/addresses',
          show:
            hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') ||
            hasPermission(...addressRead),
          icon: <PlaceIcon fontSize="small" />,
        },
        {
          label: 'Riders',
          to: '/riders',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <DeliveryDiningIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'customers',
      label: 'Customer Management',
      collapsible: true,
      items: [
        {
          label: 'Customers',
          to: '/customers',
          show: hasRole('SUPERADMIN', 'ADMIN') || hasPermission(...userManage),
          icon: <PeopleIcon fontSize="small" />,
        },
        {
          label: 'Customer Sales',
          to: '/customers/sales',
          show:
            hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'ACCOUNTANT') ||
            hasPermission(...orderRead, ...saleRead),
          icon: <LocalMallIcon fontSize="small" />,
        },
        {
          label: 'Customer Quotations',
          to: '/orders/quotations/customer',
          show:
            hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'ACCOUNTANT') ||
            hasPermission(...orderRead),
          icon: <AssignmentIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'resellers',
      label: 'Reseller Management',
      collapsible: true,
      items: [
        {
          label: 'Resellers',
          to: '/resellers',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <PeopleIcon fontSize="small" />,
        },
        {
          label: 'Reseller Sales',
          to: '/resellers/sales',
          show:
            hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'ACCOUNTANT') ||
            hasPermission(...orderRead, ...saleRead),
          icon: <ReceiptLongIcon fontSize="small" />,
        },
        {
          label: 'Reseller Quotations',
          to: '/orders/quotations/reseller',
          show:
            hasRole(
              'SUPERADMIN',
              'ADMIN',
              'MANAGER',
              'BILLER',
              'ACCOUNTANT',
              'RESELLER',
            ) || hasPermission(...orderRead, ...saleRead),
          icon: <AssignmentIcon fontSize="small" />,
        },
        {
          label: 'Reseller Approvals',
          to: '/reseller-approvals',
          show:
            hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') ||
            hasPermission(...resellerApprove),
          icon: <AssignmentIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'suppliers',
      label: 'Supplier Management',
      collapsible: true,
      items: [
        {
          label: 'Suppliers',
          to: '/suppliers',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <StoreIcon fontSize="small" />,
        },
        {
          label: 'Supplier Payments',
          to: '/supplier-payments',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
          icon: <PaidIcon fontSize="small" />,
        },
        {
          label: 'Supplier Statements',
          to: '/supplier-statements',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
          icon: <AssignmentIcon fontSize="small" />,
        },
        {
          label: 'Supplier Aging',
          to: '/supplier-aging',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
          icon: <AssignmentIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'finance',
      label: 'Finance',
      collapsible: true,
      items: [
        {
          label: 'Payments',
          to: '/payments',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'),
          icon: <PaidIcon fontSize="small" />,
        },
        {
          label: 'Analytics',
          to: '/analytics',
          show:
            hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT') ||
            hasPermission(...analyticsRead),
          icon: <InsightsIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'returns',
      label: 'Returns',
      collapsible: true,
      items: [
        {
          label: 'Sales Returns',
          to: '/returns',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'BILLER', 'RESELLER'),
          icon: <UndoIcon fontSize="small" />,
        },
        {
          label: 'Purchase Returns',
          to: '/returns/purchase',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'),
          icon: <AssignmentReturnedIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'ops',
      label: 'Operations',
      collapsible: true,
      items: [
        {
          label: 'Outbox',
          to: '/outbox',
          show:
            hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT') ||
            hasPermission(...analyticsRead),
          icon: <DashboardIcon fontSize="small" />,
        },
        {
          label: 'Low Stock',
          to: '/low-stock',
          show:
            hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') ||
            hasPermission(...productRead, ...analyticsRead),
          icon: <ListAltIcon fontSize="small" />,
        },
        {
          label: 'Support',
          to: '/support',
          show: true,
          icon: <AssignmentIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'administration',
      label: 'Administration',
      collapsible: true,
      items: [
        {
          label: 'Users',
          to: '/users',
          show: hasRole('SUPERADMIN', 'ADMIN') || hasPermission(...userManage),
          icon: <PeopleIcon fontSize="small" />,
        },
        {
          label: 'Customers',
          to: '/customers',
          show: hasRole('SUPERADMIN', 'ADMIN') || hasPermission(...userManage),
          icon: <PeopleIcon fontSize="small" />,
        },
        {
          label: 'Staff',
          to: '/staff',
          show: hasRole('SUPERADMIN', 'ADMIN'),
          icon: <PeopleIcon fontSize="small" />,
        },
        {
          label: 'Roles',
          to: '/roles',
          show: hasRole('SUPERADMIN') || hasPermission(...roleManage),
          icon: <AssignmentIcon fontSize="small" />,
        },
        {
          label: 'System Settings',
          to: '/system-settings',
          show: hasRole('SUPERADMIN'),
          icon: <SettingsIcon fontSize="small" />,
        },
        {
          label: 'Dev DB Tools',
          to: '/dev/db-tools',
          show: hasRole('SUPERADMIN'),
          icon: <AssignmentIcon fontSize="small" />,
        },
      ],
    },
  ];

  const resellerSections: NavSection[] = [
    {
      key: 'reseller-dashboard',
      label: 'Dashboard',
      items: [
        {
          label: 'Dashboard',
          to: '/dashboard',
          show: isReseller,
          icon: <DashboardIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'reseller-catalog',
      label: 'Catalog',
      collapsible: true,
      items: [
        {
          label: 'Variants',
          to: '/variants',
          show: isReseller,
          icon: <Inventory2Icon fontSize="small" />,
        },
      ],
    },
    {
      key: 'reseller-orders',
      label: 'Orders',
      collapsible: true,
      items: [
        {
          label: 'Orders',
          to: '/orders',
          show: isReseller,
          icon: <ReceiptLongIcon fontSize="small" />,
        },
        {
          label: 'Sale',
          to: '/orders/sales',
          show: isReseller,
          icon: <LocalMallIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'reseller-fulfilments',
      label: 'Fulfilments',
      collapsible: true,
      items: [
        {
          label: 'Fulfilment',
          to: '/fulfillments',
          show: isReseller,
          icon: <LocalShippingIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'reseller-returns',
      label: 'Returns',
      collapsible: true,
      items: [
        {
          label: 'Returns',
          to: '/returns',
          show: isReseller,
          icon: <UndoIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'reseller-finance',
      label: 'Finance',
      collapsible: true,
      items: [
        {
          label: 'Accounts',
          to: '/accounts',
          show: isReseller,
          icon: <PaidIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'reseller-profile',
      label: 'Profile',
      collapsible: true,
      items: [
        {
          label: 'Profile',
          to: '/profile',
          show: isReseller,
          icon: <AccountCircleIcon fontSize="small" />,
        },
      ],
    },
  ];

  const billerSections: NavSection[] = [
    {
      key: 'biller-dashboard',
      label: 'Dashboard',
      items: [
        {
          label: 'Dashboard',
          to: '/biller-dashboard',
          show: isBiller,
          icon: <DashboardIcon fontSize="small" />,
        },
      ],
    },
  ];

  const sections = isReseller
    ? resellerSections
    : isBiller
    ? [...billerSections, ...defaultSections.filter((section) => !['customers', 'resellers'].includes(section.key))]
    : defaultSections;

  const headerDate = React.useMemo(() => {
    const now = new Date();
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
    const day = new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(now);
    const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now);
    return `${weekday}, ${day} ${month}`;
  }, []);

  const accountEmail = meData?.me?.email || user?.email || 'user@store';
  const accountName = React.useMemo(() => {
    const fullName = meData?.me?.customerProfile?.fullName?.trim();
    if (fullName) return fullName;
    if (user?.email) {
      const [prefix] = user.email.split('@');
      if (prefix) return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return user?.roleName || 'Admin User';
  }, [meData?.me?.customerProfile?.fullName, user?.email, user?.roleName]);

  const accountInitials = React.useMemo(() => {
    const source = meData?.me?.customerProfile?.fullName || user?.email || accountName || 'User';
    return source
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((part: string) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  }, [meData?.me?.customerProfile?.fullName, user?.email, accountName]);

  const visibleNavItems = React.useMemo(
    () => {
      const sectionItems = sections.flatMap((section) => section.items.filter((item) => item.show));
      return sectionItems.concat({ label: 'My Profile', to: '/profile', show: true, icon: <AccountCircleIcon fontSize="small" /> });
    },
    [sections],
  );

  const executeGlobalSearch = React.useCallback(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      notify('Enter a keyword to search');
      return;
    }
    const match = visibleNavItems.find((item) => item.label.toLowerCase().includes(query));
    if (match) {
      navigate(match.to);
      setSearchTerm('');
      if (!isMdUp) {
        setMobileOpen(false);
      }
    } else {
      notify('No matching destination found', 'warning');
    }
  }, [searchTerm, visibleNavItems, navigate, isMdUp]);

  const toggleAccountMenu = React.useCallback(() => setAccountMenuOpen((open) => !open), []);
  const closeAccountMenu = React.useCallback(() => setAccountMenuOpen(false), []);
  const handleViewProfile = React.useCallback(() => {
    navigate('/profile');
    closeAccountMenu();
    setMobileOpen(false);
  }, [navigate, closeAccountMenu]);

  const handleChangePassword = React.useCallback(() => {
    navigate('/profile#change-password');
    notify('Scroll to the Change Password section to continue', 'info');
    closeAccountMenu();
    setMobileOpen(false);
  }, [navigate, closeAccountMenu]);

  const handleLogout = React.useCallback(() => {
    closeAccountMenu();
    setMobileOpen(false);
    logout();
    navigate('/login');
  }, [closeAccountMenu, logout, navigate]);

  const handleComingSoon = React.useCallback((label: string) => {
    notify(`${label} is coming soon`, 'info');
    closeAccountMenu();
  }, [closeAccountMenu]);

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        borderRight: `1px solid ${alpha(theme.palette.common.black, 0.06)}`,
        px: 3,
        py: 4,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.success.main }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
            Store Admin
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Control Center
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mt: 5, flexGrow: 1, overflowY: 'auto' }}>
        {sections.map((section) => {
          const visible = section.items.filter((item) => item.show);
          if (!visible.length) return null;
          const collapsible = Boolean(section.collapsible);
          const collapsed = collapsible ? collapsedSections[section.key] ?? false : false;
          const listNode = (
            <List disablePadding sx={{ mt: collapsible ? 1 : 0 }}>
              {visible.map((item) => {
                const selected = location.pathname.startsWith(item.to);
                return (
                  <ListItemButton
                    key={item.to}
                    component={Link}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    selected={selected}
                    sx={{
                      mb: 0.5,
                      borderRadius: 2,
                      px: 1.75,
                      py: 1.25,
                      color: selected ? theme.palette.success.main : 'text.secondary',
                      bgcolor: selected ? alpha(theme.palette.success.main, 0.15) : 'transparent',
                      boxShadow: selected ? '0 12px 24px rgba(16, 94, 62, 0.12)' : 'none',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.success.main, 0.12),
                        color: theme.palette.success.main,
                      },
                      '&.Mui-selected:hover': {
                        bgcolor: alpha(theme.palette.success.main, 0.18),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 42, color: 'inherit' }}>{item.icon}</ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          );
          return (
            <Box key={section.key} sx={{ mb: 3.5 }}>
              <ButtonBase
                onClick={
                  collapsible
                    ? () => {
                        toggleSectionCollapse(section.key);
                      }
                    : undefined
                }
                disableRipple={!collapsible}
                sx={{
                  width: '100%',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: collapsible ? 0.75 : 1.5,
                  px: 0,
                  py: collapsible ? 0.5 : 0,
                  cursor: collapsible ? 'pointer' : 'default',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 700,
                    letterSpacing: 1.4,
                    display: 'block',
                  }}
                >
                  {section.label}
                </Typography>
                {collapsible && (
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{
                      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 160ms ease',
                      color: 'text.secondary',
                    }}
                  />
                )}
              </ButtonBase>
              {collapsible ? (
                <Collapse in={!collapsed} timeout={160} unmountOnExit>
                  {listNode}
                </Collapse>
              ) : (
                listNode
              )}
            </Box>
          );
        })}
        <Divider sx={{ my: 3 }} />
        {!isReseller && (
          <List disablePadding>
            <ListItemButton
              component={Link}
              to="/profile"
              selected={location.pathname.startsWith('/profile')}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                px: 1.75,
                py: 1.25,
                color: location.pathname.startsWith('/profile') ? theme.palette.success.main : 'text.secondary',
                bgcolor: location.pathname.startsWith('/profile') ? alpha(theme.palette.success.main, 0.15) : 'transparent',
                '&:hover': {
                  bgcolor: alpha(theme.palette.success.main, 0.12),
                  color: theme.palette.success.main,
                },
                '&.Mui-selected:hover': {
                  bgcolor: alpha(theme.palette.success.main, 0.18),
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 42, color: 'inherit' }}>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="My Profile" primaryTypographyProps={{ fontWeight: 700 }} />
            </ListItemButton>
          </List>
        )}
      </Box>

      <Box sx={{ mt: 1 }}>
        <Collapse in={accountMenuOpen} timeout={160} unmountOnExit>
          <Paper elevation={10} sx={{ borderRadius: 3, mb: 1.5, overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: theme.palette.success.main, fontWeight: 600 }}>
                {accountInitials}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {accountName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {accountEmail}
                </Typography>
              </Box>
            </Box>
            <Divider />
            <List disablePadding>
              <ListItemButton onClick={handleViewProfile} sx={{ px: 3 }}>
                <ListItemText primary="My Profile" primaryTypographyProps={{ fontWeight: 700, color: 'success.main' }} />
              </ListItemButton>
              <ListItemButton onClick={() => handleComingSoon('My Balance')} sx={{ px: 3 }}>
                <ListItemText primary="My Balance" />
              </ListItemButton>
              <ListItemButton onClick={() => handleComingSoon('My Bank')} sx={{ px: 3 }}>
                <ListItemText primary="My Bank" />
              </ListItemButton>
              <ListItemButton onClick={handleChangePassword} sx={{ px: 3 }}>
                <ListItemText primary="Change Password" />
              </ListItemButton>
              <Divider sx={{ mx: 3 }} />
              <ListItemButton onClick={handleLogout} sx={{ px: 3, pb: 2 }}>
                <ListItemText primary="Logout" primaryTypographyProps={{ color: 'error.main', fontWeight: 700 }} />
              </ListItemButton>
            </List>
          </Paper>
        </Collapse>

        <ButtonBase
          onClick={toggleAccountMenu}
          sx={{
            width: '100%',
            textAlign: 'left',
            borderRadius: 3,
            p: 0,
          }}
        >
          <Box
            sx={{
              borderRadius: 3,
              p: 2,
              width: '100%',
              bgcolor: theme.palette.success.main,
              color: '#fff',
              boxShadow: '0 20px 38px rgba(16, 94, 62, 0.28)',
              transition: 'transform 120ms ease, box-shadow 120ms ease',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 28px 54px rgba(16, 94, 62, 0.36)',
              },
            }}
          >
            <Avatar sx={{ width: 44, height: 44, bgcolor: '#fff', color: theme.palette.success.main, fontWeight: 700 }}>
              {accountInitials}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {accountName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {accountEmail}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: '#fff',
                display: 'grid',
                placeItems: 'center',
                color: theme.palette.success.main,
                transition: 'transform 160ms ease',
                transform: accountMenuOpen ? 'rotate(45deg)' : 'none',
              }}
            >
              <AddIcon fontSize="small" />
            </Box>
          </Box>
        </ButtonBase>
      </Box>
    </Box>
  );

  const {
    data: headerNotificationsData,
    loading: notificationsLoading,
    startPolling,
    stopPolling,
    refetch: refetchNotifications,
  } = useHeaderNotificationsQuery({
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    skip: !token,
    nextFetchPolicy: 'cache-first',
  });

  React.useEffect(() => {
    if (!token) {
      stopPolling?.();
      return undefined;
    }

    const POLL_INTERVAL = 15000;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refetchNotifications();
        startPolling?.(POLL_INTERVAL);
      } else {
        stopPolling?.();
      }
    };

    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);

    const handleFocus = () => {
      void refetchNotifications();
      startPolling?.(POLL_INTERVAL);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      stopPolling?.();
    };
  }, [token, startPolling, stopPolling, refetchNotifications]);

  const notifications = headerNotificationsData?.notifications ?? [];

  const unreadCount = React.useMemo(
    () =>
      notifications.reduce(
        (count, notification) => (notification.isRead ? count : count + 1),
        0,
      ),
    [notifications],
  );

  const hasUnread = unreadCount > 0;
  const cappedUnread = unreadCount > 9 ? '9+' : unreadCount;

  const headerActionButtonSx = React.useMemo(
    () => ({
      bgcolor: 'transparent',
      color: theme.palette.success.main,
      width: 44,
      height: 44,
      borderRadius: 16,
      transition: 'background-color 140ms ease, transform 140ms ease, box-shadow 140ms ease',
      '&:hover': {
        bgcolor: alpha(theme.palette.success.main, 0.1),
        transform: 'translateY(-1px)',
        boxShadow: '0 8px 16px rgba(16, 94, 62, 0.18)',
      },
    }),
    [theme.palette.success.main],
  );

  const headerContent = token ? (
    <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 2, md: 4 }, pb: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
          {!isMdUp && token && (
            <IconButton
              onClick={toggleMobileDrawer}
              sx={{
                borderRadius: 2,
                bgcolor: '#fff',
                color: theme.palette.success.main,
                boxShadow: '0 10px 24px rgba(16, 94, 62, 0.18)',
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              bgcolor: theme.palette.success.main,
              borderRadius: 999,
              px: { xs: 1.5, md: 3 },
              py: { xs: 1, md: 1.25 },
              color: '#fff',
              boxShadow: '0 28px 48px rgba(16, 94, 62, 0.28)',
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '999px',
                bgcolor: 'rgba(255,255,255,0.14)',
                display: 'grid',
                placeItems: 'center',
                mr: { xs: 1.5, md: 2 },
              }}
            >
              <SearchIcon sx={{ opacity: 0.85, color: '#fff' }} />
            </Box>
            <InputBase
              placeholder="Search"
              inputProps={{ 'aria-label': 'global search' }}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  executeGlobalSearch();
                }
              }}
              sx={{
                flexGrow: 1,
                color: 'inherit',
                fontWeight: 500,
                '& .MuiInputBase-input::placeholder': {
                  color: 'rgba(255,255,255,0.7)',
                  opacity: 1,
                },
              }}
            />
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                borderColor: 'rgba(255,255,255,0.22)',
                mx: { xs: 1.5, md: 2 },
                height: 32,
                alignSelf: 'center',
              }}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                letterSpacing: 0.4,
                whiteSpace: 'nowrap',
              }}
            >
              {headerDate}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              bgcolor: '#fff',
              borderRadius: 18,
              px: 1,
              py: 0.5,
              boxShadow: '0 18px 36px rgba(16, 94, 62, 0.12)',
            }}
          >
            <IconButton sx={headerActionButtonSx}>
              <Badge color="error" variant="dot" overlap="circular" invisible={!hasUnread}>
                <ChatBubbleOutlineIcon />
              </Badge>
            </IconButton>
            <IconButton
              sx={headerActionButtonSx}
              onClick={handleNotificationsButtonClick}
              aria-haspopup="true"
              aria-expanded={notificationsOpen ? 'true' : undefined}
              aria-controls={notificationsOpen ? 'header-notifications-popover' : undefined}
            >
              <Badge
                color="error"
                overlap="circular"
                variant={hasUnread ? 'standard' : 'dot'}
                badgeContent={hasUnread ? cappedUnread : undefined}
                invisible={!hasUnread}
                sx={{
                  '& .MuiBadge-badge': {
                    minWidth: 20,
                    height: 20,
                    borderRadius: '999px',
                    px: '6px',
                    fontWeight: 700,
                    fontSize: 12,
                    boxShadow: '0 4px 8px rgba(189, 36, 45, 0.4)',
                  },
                }}
              >
                <NotificationsNoneIcon />
              </Badge>
            </IconButton>
          </Box>
        </Stack>
      </Stack>
    </Box>
  ) : (
    <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 4 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Store Admin
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button component={Link} to="/login" variant="contained" color="success">
            Login
          </Button>
        </Stack>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f3f6f9' }}>
      <CssBaseline />

      {token && (
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }} aria-label="main navigation">
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={toggleMobileDrawer}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
              },
            }}
          >
            {sidebarContent}
          </Drawer>
          <Drawer
            variant="permanent"
            open
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
              },
            }}
          >
            {sidebarContent}
          </Drawer>
        </Box>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: '#f3f6f9',
        }}
      >
        {headerContent}
        <Popover
          id="header-notifications-popover"
          open={notificationsOpen}
          anchorEl={notificationsAnchorEl}
          onClose={handleCloseNotifications}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              width: 320,
              maxWidth: '90vw',
              p: 1.5,
              mt: 1,
              boxShadow: '0 18px 36px rgba(16, 94, 62, 0.16)',
              borderRadius: 2,
            },
          }}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Notifications
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </Typography>
            </Stack>
            <Divider />
            {notificationsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={20} />
              </Box>
            ) : notifications.length ? (
              <List
                dense
                disablePadding
                sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5, mr: -0.5 }}
              >
                {notifications.map((notification) => (
                  <ListItemButton
                    key={notification.id}
                    onClick={() =>
                      void handleNotificationItemClick(notification.id, notification.isRead)
                    }
                    sx={{
                      alignItems: 'flex-start',
                      borderRadius: 1.5,
                      mb: 0.5,
                      transition: 'background-color 140ms ease',
                      ...(notification.isRead
                        ? {}
                        : {
                            bgcolor: alpha(theme.palette.success.main, 0.08),
                          }),
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                      <Badge
                        color="error"
                        variant="dot"
                        overlap="circular"
                        invisible={notification.isRead}
                      >
                        <NotificationsNoneIcon fontSize="small" />
                      </Badge>
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{
                        variant: 'body2',
                        sx: { fontWeight: notification.isRead ? 400 : 600 },
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        sx: { color: 'text.secondary' },
                      }}
                      primary={notification.message}
                      secondary={formatNotificationTimestamp(notification.createdAt)}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center', px: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  You&apos;re all caught up
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  No notifications to display right now.
                </Typography>
              </Box>
            )}
          </Stack>
        </Popover>
        <Box sx={{ flexGrow: 1, px: { xs: 2, md: 4 }, pb: { xs: 4, md: 6 } }}>
          <Box sx={{ maxWidth: 1180, mx: 'auto', width: '100%' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
