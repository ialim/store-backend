import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Container,
  Button,
} from '@mui/material';
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
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Collapse, ListSubheader } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useAuth } from './AuthProvider';

const drawerWidth = 240;

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { token, logout, hasRole, hasPermission } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggle = () => setMobileOpen((v) => !v);

  const sections: Array<{ key: string; label: string; items: any[] }> = [
    {
      key: 'ops',
      label: 'Operations',
      items: [
        {
          label: 'Outbox',
          to: '/outbox',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT') || hasPermission('VIEW_REPORTS'),
          icon: <DashboardIcon />,
        },
        {
          label: 'Fulfillment',
          to: '/fulfillment',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER') || hasPermission('ASSIGN_MANAGER', 'ASSIGN_BILLER'),
          icon: <LocalShippingIcon />,
        },
        {
          label: 'Low Stock',
          to: '/low-stock',
          show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('MANAGE_PRODUCTS', 'VIEW_REPORTS'),
          icon: <ListAltIcon />,
        },
      ],
    },
    {
      key: 'proc',
      label: 'Procurement',
      items: [
        { label: 'Suppliers', to: '/suppliers', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <StoreIcon /> },
        { label: 'Requisitions', to: '/requisitions', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <AssignmentIcon /> },
        { label: 'Purchase Orders', to: '/purchase-orders', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <AssignmentIcon /> },
        { label: 'Receive Stock', to: '/receive-stock', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <Inventory2Icon /> },
        { label: 'Invoice Ingest', to: '/invoice-ingest', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <AssignmentIcon /> },
        { label: 'Invoice Imports', to: '/invoice-imports', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <AssignmentIcon /> },
      ],
    },
    {
      key: 'catalog',
      label: 'Catalog & Stock',
      items: [
        { label: 'Products', to: '/products', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER') || hasPermission('MANAGE_PRODUCTS'), icon: <Inventory2Icon /> },
        { label: 'Variants', to: '/variants', show: true, icon: <Inventory2Icon /> },
        { label: 'Facets', to: '/facets', show: hasPermission('MANAGE_PRODUCTS'), icon: <AssignmentIcon /> },
        { label: 'Stock', to: '/stock', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <Inventory2Icon /> },
        { label: 'Stores', to: '/stores', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <StoreIcon /> },
      ],
    },
    {
      key: 'finance',
      label: 'Finance',
      items: [
        { label: 'Payments', to: '/payments', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'), icon: <PaidIcon /> },
        { label: 'Supplier Payments', to: '/supplier-payments', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'), icon: <PaidIcon /> },
        { label: 'Supplier Statements', to: '/supplier-statements', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'), icon: <PaidIcon /> },
        { label: 'Analytics', to: '/analytics', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT') || hasPermission('VIEW_REPORTS'), icon: <InsightsIcon /> },
      ],
    },
    {
      key: 'returns',
      label: 'Returns',
      items: [
        { label: 'Returns', to: '/returns', show: hasRole('SUPERADMIN', 'ADMIN', 'MANAGER'), icon: <UndoIcon /> },
      ],
    },
    {
      key: 'admin',
      label: 'Admin',
      items: [
        { label: 'Users', to: '/users', show: hasRole('SUPERADMIN', 'ADMIN') || hasPermission('MANAGE_USERS'), icon: <PeopleIcon /> },
        { label: 'Customers', to: '/customers', show: hasRole('SUPERADMIN', 'ADMIN') || hasPermission('MANAGE_USERS'), icon: <PeopleIcon /> },
        { label: 'Resellers', to: '/resellers', show: hasRole('SUPERADMIN','ADMIN','MANAGER'), icon: <PeopleIcon /> },
        { label: 'Reseller Approvals', to: '/reseller-approvals', show: hasRole('SUPERADMIN','ADMIN','MANAGER') || hasPermission('APPROVE_RESELLER'), icon: <AssignmentIcon /> },
        { label: 'Support', to: '/support', show: true, icon: <AssignmentIcon /> },
        { label: 'Staff', to: '/staff', show: hasRole('SUPERADMIN', 'ADMIN'), icon: <PeopleIcon /> },
        { label: 'Dev DB Tools', to: '/dev/db-tools', show: hasRole('SUPERADMIN'), icon: <AssignmentIcon /> },
      ],
    },
  ];
  const openInit: Record<string, boolean> = Object.fromEntries(sections.map((s) => [s.key, true]));
  const [open, setOpen] = React.useState<Record<string, boolean>>(openInit);

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      {sections.map((section) => {
        const visible = section.items.filter((i) => i.show);
        if (!visible.length) return null;
        return (
          <List key={section.key} subheader={<ListSubheader>{section.label}</ListSubheader>}>
            <ListItemButton onClick={() => setOpen((o) => ({ ...o, [section.key]: !o[section.key] }))}>
              <ListItemText primary={section.label} />
              {open[section.key] ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={open[section.key]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {visible.map((item) => (
                  <ListItemButton
                    key={item.to}
                    component={Link}
                    to={item.to}
                    selected={location.pathname.startsWith(item.to)}
                    onClick={() => setMobileOpen(false)}
                    sx={{ pl: 4 }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
            <Divider />
          </List>
        );
      })}
      <List>
        <ListItemButton component={Link} to="/profile" selected={location.pathname.startsWith('/profile')} onClick={() => setMobileOpen(false)}>
          <ListItemIcon><AccountCircleIcon /></ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItemButton>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          {token && (
            <IconButton color="inherit" edge="start" onClick={toggle} sx={{ mr: 2, display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Store Admin
          </Typography>
          {token ? (
            <>
              <Button color="inherit" component={Link} to="/profile" sx={{ mr: 1 }}>Profile</Button>
              <Button color="inherit" onClick={() => { logout(); navigate('/login'); }}>Logout</Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/variants" sx={{ mr: 1 }}>Variants</Button>
              <Button color="inherit" component={Link} to="/login">Login</Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {token && (
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }} aria-label="navigation">
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={toggle}
            ModalProps={{ keepMounted: true }}
            sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
        <Toolbar />
        <Container maxWidth="lg">
          {children}
        </Container>
      </Box>
    </Box>
  );
}
