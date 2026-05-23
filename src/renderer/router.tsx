import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import {
  createHashRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Sidebar } from './app/layout/Sidebar.js';
import { StatusBar } from './app/layout/StatusBar.js';
import { Placeholder } from './pages/Placeholder.js';
import { LegacyFrame } from './pages/Legacy/LegacyFrame.js';
import { SetupWizard } from './pages/Setup/Wizard.js';
import { Txt2ImgPage } from './pages/Txt2Img/index.js';
import { ModelsPage } from './pages/Models/index.js';
import { GalleryPage } from './pages/Gallery/index.js';
import { useBackendStatusSync } from './hooks/useBackendStatus.js';

function Shell({ children }: { children: ReactNode }): ReactElement {
  useBackendStatusSync();
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">{children}</main>
      </div>
      <StatusBar />
    </div>
  );
}

function ShellOutlet(): ReactElement {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

function InstallGuard({ children }: { children: ReactNode }): ReactElement {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    void window.forge.installer.state().then((state) => {
      const ok = state.installedAt != null;
      setInstalled(ok);
      if (!ok && !pathname.startsWith('/setup')) {
        navigate('/setup/welcome', { replace: true });
      }
    });
  }, [navigate, pathname]);

  if (installed === null) {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}

const router = createHashRouter([
  {
    path: '/',
    element: (
      <InstallGuard>
        <Outlet />
      </InstallGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/generate/txt2img" replace /> },
      { path: 'setup/*', element: <SetupWizard /> },
      {
        element: <ShellOutlet />,
        children: [
          { path: 'generate/txt2img', element: <Txt2ImgPage /> },
          { path: 'generate/img2img', element: <Placeholder title="Img2Img" milestone="M4" /> },
          { path: 'gallery', element: <GalleryPage /> },
          { path: 'models', element: <ModelsPage /> },
          { path: 'loras', element: <Placeholder title="LoRAs" milestone="M4" /> },
          { path: 'settings', element: <Placeholder title="Settings" milestone="M5" /> },
          { path: 'legacy/:tab', element: <LegacyFrame /> },
        ],
      },
      { path: '*', element: <Navigate to="/generate/txt2img" replace /> },
    ],
  },
]);

export function AppRouter(): ReactElement {
  return <RouterProvider router={router} />;
}
