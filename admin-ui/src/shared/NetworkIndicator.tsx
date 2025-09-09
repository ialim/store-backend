import React from 'react';
import { LinearProgress, Box } from '@mui/material';

export default function NetworkIndicator() {
  const [count, setCount] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    const onStart = () => {
      setCount((c) => c + 1);
    };
    const onEnd = () => {
      setCount((c) => Math.max(0, c - 1));
    };
    window.addEventListener('app:net:start', onStart as EventListener);
    window.addEventListener('app:net:end', onEnd as EventListener);
    return () => {
      window.removeEventListener('app:net:start', onStart as EventListener);
      window.removeEventListener('app:net:end', onEnd as EventListener);
    };
  }, []);

  React.useEffect(() => {
    if (count > 0) {
      // Delay showing to avoid flicker for very fast requests
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setVisible(true), 150);
    } else {
      if (timer.current) window.clearTimeout(timer.current);
      setVisible(false);
    }
  }, [count]);

  if (!visible) return null;
  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000 }}>
      <LinearProgress />
    </Box>
  );
}

