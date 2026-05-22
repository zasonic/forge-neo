import { useEffect, useState, type ReactElement } from 'react';
import { createHashRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { Sidebar } from './app/layout/Sidebar.js';
import { StatusBar } from './app/layout/StatusBar.js';
import { Placeholder } from './pages/Placeholder.js';
import { LegacyFrame } from './pages/Legacy/LegacyFrame.js';
import { SetupWizard } from './pages/Setup/SetupWizard.js';
import { useBackendStatusSync } from './hooks/useBackendStatus.js';

function Shell(): ReactElement {
  useBackendStatusSync();
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

const mainRouter = createHashRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/generate/txt2img" replace /> },
      { path: 'generate/txt2img', element: <Placeholder title="Txt2Img" milestone="M3" /> },
      { path: 'generate/img2img', element: <Placeholder title="Img2Img" milestone="M4" /> },
      { path: 'gallery', element: <Placeholder title="Gallery" milestone="M4" /> },
      { path: 'models', element: <Placeholder title="Models" milestone="M3" /> },
      { path: 'loras', element: <Placeholder title="LoRAs" milestone="M4" /> },
      { path: 'settings', element: <Placeholder title="Settings" milestone="M5" /> },
      { path: 'legacy/:tab', element: <LegacyFrame /> },
      { path: '*', element: <Navigate to="/generate/txt2img" replace /> },
    ],
  },
]);

const setupRouter = createHashRouter([{ path: '*', element: <SetupWizard /> }]);

function SplashScreen(): ReactElement {
  return (
    <div className="h-full flex items-center justify-center text-white/40 text-sm">
      Starting Forge Neo…
    </div>
  );
}

export function AppRouter(): ReactElement {
  const [ready, setReady] = useState<{ installed: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void window.forge.setup.getProgress().then((p) => {
      if (!cancelled) setReady({ installed: p.overall === 'done' });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <SplashScreen />;
  return <RouterProvider router={ready.installed ? mainRouter : setupRouter} />;
}
