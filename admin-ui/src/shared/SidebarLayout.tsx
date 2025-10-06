import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonBase,
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
import StoreIcon from '@mui/icons-material/Store';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PaidIcon from '@mui/icons-material/Paid';
import UndoIcon from '@mui/icons-material/Undo';
import InsightsIcon from '@mui/icons-material/Insights';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from './AuthProvider';
import { notify } from './notify';
import { useHeaderNotificationsQuery, useMeQuery } from '../generated/graphql';

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

  const toggleMobileDrawer = () => setMobileOpen((prev) => !prev);

  const sections: Array<{
    key: string;
    label: string;
    items: { label: string; to: string; show: boolean; icon: React.ReactNode }[];
  }> = [
    {
      key: 'ops',
      label: 'Operations',
      items: [
        {
          label: 'Outbox',
          to: '/outbox',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT') || hasPermission('VIEW_REPORTS'),
          icon: <DashboardIcon fontSize="small" />,
        },
        {
          label: 'Fulfillment',
          to: '/fulfillment',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER') || hasPermission('ASSIGN_MANAGER', 'ASSIGN_BILLER'),
          icon: <LocalShippingIcon fontSize="small" />,
        },
        {
          label: 'Low Stock',
          to: '/low-stock',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('MANAGE_PRODUCTS', 'VIEW_REPORTS'),
          icon: <ListAltIcon fontSize="small" />,
        },
      ],
    },
    {
      key: 'proc',
      label: 'Procurement',
      items: [
        { label: 'Suppliers', to: '/suppliers', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <StoreIcon fontSize="small" /> },
        { label: 'Requisitions', to: '/requisitions', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <AssignmentIcon fontSize="small" /> },
        { label: 'Purchase Orders', to: '/purchase-orders', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <AssignmentIcon fontSize="small" /> },
        { label: 'Receive Stock', to: '/receive-stock', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <Inventory2Icon fontSize="small" /> },
        { label: 'Invoice Ingest', to: '/invoice-ingest', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <AssignmentIcon fontSize="small" /> },
        { label: 'Invoice Imports', to: '/invoice-imports', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <AssignmentIcon fontSize="small" /> },
      ],
    },
    {
      key: 'catalog',
      label: 'Catalog & Stock',
      items: [
        { label: 'Products', to: '/products', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('MANAGE_PRODUCTS'), icon: <Inventory2Icon fontSize="small" /> },
        { label: 'Variants', to: '/variants', show: true, icon: <Inventory2Icon fontSize="small" /> },
        { label: 'Import Variants', to: '/variants/import', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('MANAGE_PRODUCTS'), icon: <CloudUploadIcon fontSize="small" /> },
        { label: 'Assets', to: '/assets', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('MANAGE_PRODUCTS'), icon: <PhotoLibraryIcon fontSize="small" /> },
        { label: 'Collections', to: '/collections', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('MANAGE_PRODUCTS'), icon: <AssignmentIcon fontSize="small" /> },
        { label: 'Facets', to: '/facets', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('MANAGE_PRODUCTS'), icon: <AssignmentIcon fontSize="small" /> },
        { label: 'Stock', to: '/stock', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <Inventory2Icon fontSize="small" /> },
        { label: 'Stores', to: '/stores', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <StoreIcon fontSize="small" /> },
      ],
    },
    {
      key: 'finance',
      label: 'Finance',
      items: [
        { label: 'Payments', to: '/payments', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'), icon: <PaidIcon fontSize="small" /> },
        { label: 'Supplier Payments', to: '/supplier-payments', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'), icon: <PaidIcon fontSize="small" /> },
        { label: 'Supplier Statements', to: '/supplier-statements', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'), icon: <PaidIcon fontSize="small" /> },
        { label: 'Supplier Aging', to: '/supplier-aging', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'), icon: <PaidIcon fontSize="small" /> },
        { label: 'Analytics', to: '/analytics', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT') || hasPermission('VIEW_REPORTS'), icon: <InsightsIcon fontSize="small" /> },
      ],
    },
    {
      key: 'returns',
      label: 'Returns',
      items: [
        { label: 'Returns', to: '/returns', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <UndoIcon fontSize="small" /> },
      ],
    },
    {
      key: 'admin',
      label: 'Admin',
      items: [
        { label: 'Users', to: '/users', show: hasRole('SUPERADMIN', 'ADMIN') || hasPermission('MANAGE_USERS'), icon: <PeopleIcon fontSize="small" /> },
        { label: 'Customers', to: '/customers', show: hasRole('SUPERADMIN', 'ADMIN') || hasPermission('MANAGE_USERS'), icon: <PeopleIcon fontSize="small" /> },
        { label: 'Resellers', to: '/resellers', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <PeopleIcon fontSize="small" /> },
        { label: 'Reseller Approvals', to: '/reseller-approvals', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('APPROVE_RESELLER'), icon: <AssignmentIcon fontSize="small" /> },
        { label: 'Support', to: '/support', show: true, icon: <AssignmentIcon fontSize="small" /> },
        { label: 'Staff', to: '/staff', show: hasRole('SUPERADMIN', 'ADMIN'), icon: <PeopleIcon fontSize="small" /> },
        { label: 'Dev DB Tools', to: '/dev/db-tools', show: hasRole('SUPERADMIN'), icon: <AssignmentIcon fontSize="small" /> },
      ],
    },
  ];

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
          return (
            <Box key={section.key} sx={{ mb: 3.5 }}>
              <Typography
                variant="overline"
                sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1.4, mb: 1.5, display: 'block' }}
              >
                {section.label}
              </Typography>
              <List disablePadding>
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
            </Box>
          );
        })}
        <Divider sx={{ my: 3 }} />
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

  const unreadCount = React.useMemo(() => {
    const notifications = headerNotificationsData?.notifications ?? [];
    return notifications.reduce((count, notification) => (notification.isRead ? count : count + 1), 0);
  }, [headerNotificationsData?.notifications]);

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
            <IconButton sx={headerActionButtonSx}>
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
          <Button component={Link} to="/variants" variant="outlined" color="success">
            Variants
          </Button>
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
        <Box sx={{ flexGrow: 1, px: { xs: 2, md: 4 }, pb: { xs: 4, md: 6 } }}>
          <Box sx={{ maxWidth: 1180, mx: 'auto', width: '100%' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
