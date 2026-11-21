import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { consumeFlash } from '../../lib/notifications';

export default function NotificationHost({ editing = false }: { editing?: boolean }) {
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
  // Keep feedback clear of the sticky save and publish controls.
  const offset = editing ? { top: 'calc(var(--header-height) + 0.75rem)' } : undefined;
  return (
    <Toaster
      theme={theme}
      position={
        editing ? (mobile ? 'top-center' : 'top-right') : mobile ? 'bottom-center' : 'bottom-right'
      }
      offset={offset}
      mobileOffset={offset}
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
