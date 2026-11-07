import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { consumeFlash } from '../../lib/notifications';

export default function NotificationHost() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const sync = () => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      setMobile(window.matchMedia('(max-width: 600px)').matches);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', sync);
    consumeFlash();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, []);
  return (
    <Toaster
      theme={theme}
      position={mobile ? 'bottom-center' : 'bottom-right'}
      duration={2800}
      closeButton
      richColors={false}
      toastOptions={{
        style: {
          background: 'var(--card)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          fontFamily: 'var(--font-body)',
        },
      }}
    />
  );
}
