import type { ReactElement } from 'react';
import { createHashRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { Sidebar } from './app/layout/Sidebar.js';
import { StatusBar } from './app/layout/StatusBar.js';
import { Placeholder } from './pages/Placeholder.js';
import { LegacyFrame } from './pages/Legacy/LegacyFrame.js';
import { Txt2ImgPage } from './pages/Txt2Img/Txt2ImgPage.js';
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

const router = createHashRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/generate/txt2img" replace /> },
      { path: 'generate/txt2img', element: <Txt2ImgPage /> },
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

export function AppRouter(): ReactElement {
  return <RouterProvider router={router} />;
}
