import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Outbox from './pages/Outbox';
import LowStock from './pages/LowStock';
import Fulfillment from './pages/Fulfillment';
import { useAuth } from './shared/AuthProvider';

export default function App() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Store Admin</Typography>
          {token ? (
            <>
              <Button color="inherit" component={Link} to="/outbox">Outbox</Button>
              <Button color="inherit" component={Link} to="/low-stock">Low Stock</Button>
              <Button color="inherit" component={Link} to="/fulfillment">Fulfillment</Button>
              <Button color="inherit" onClick={() => { logout(); navigate('/login'); }}>Logout</Button>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">Login</Button>
          )}
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/outbox" element={<Outbox />} />
          <Route path="/low-stock" element={<LowStock />} />
          <Route path="/fulfillment" element={<Fulfillment />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Container>
    </Box>
  );
}

