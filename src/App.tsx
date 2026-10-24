import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { StartupScreen } from './components/common';

import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { RevivalStudioPage } from './pages/RevivalStudioPage';
import { FusionPage } from './pages/FusionPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { TeamsPage } from './pages/TeamsPage';
import { RemindersPage } from './pages/RemindersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import ProjectFormPage from './pages/ProjectFormPage';

export function App() {
  return (
    <AppProvider>
      <StartupScreen />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/new" element={<ProjectFormPage />} />
            <Route path="projects/:id/edit" element={<ProjectFormPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="revival-studio" element={<RevivalStudioPage />} />
            <Route path="fusion" element={<FusionPage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="reminders" element={<RemindersPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
