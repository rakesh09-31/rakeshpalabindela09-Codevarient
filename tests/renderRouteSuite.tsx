import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '../src/contexts/AppContext';
import { ToastProvider } from '../src/components/ui/Toast';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import { AppLayout } from '../src/components/layout/AppLayout';

import { DashboardPage } from '../src/pages/DashboardPage';
import { ProjectsPage } from '../src/pages/ProjectsPage';
import { ProjectDetailPage } from '../src/pages/ProjectDetailPage';
import { RevivalStudioPage } from '../src/pages/RevivalStudioPage';
import { FusionPage } from '../src/pages/FusionPage';
import { FusionProposalPage } from '../src/pages/FusionProposalPage';
import { DiscoverPage } from '../src/pages/DiscoverPage';
import { ProfilePage } from '../src/pages/ProfilePage';
import { TeamsPage } from '../src/pages/TeamsPage';
import { RemindersPage } from '../src/pages/RemindersPage';
import { AnalyticsPage } from '../src/pages/AnalyticsPage';
import { SettingsPage } from '../src/pages/SettingsPage';
import ProjectFormPage from '../src/pages/ProjectFormPage';

export function renderSpecificRoute(routePath: string): string {
  return ReactDOMServer.renderToString(
    <ErrorBoundary title="Root Error Boundary">
      <AppProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[routePath]}>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/new" element={<ProjectFormPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route path="revival-studio" element={<RevivalStudioPage />} />
                <Route path="fusion" element={<FusionPage />} />
                <Route path="fusion/proposal/:proposalId" element={<FusionProposalPage />} />
                <Route path="discover" element={<DiscoverPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="teams" element={<TeamsPage />} />
                <Route path="reminders" element={<RemindersPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
