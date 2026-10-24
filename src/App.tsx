import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { ToastProvider } from './components/ui/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { StartupScreen, ErrorBoundary } from './components/common';

import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { RevivalStudioPage } from './pages/RevivalStudioPage';
import { FusionPage } from './pages/FusionPage';
import { FusionProposalPage } from './pages/FusionProposalPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { TeamsPage } from './pages/TeamsPage';
import { RemindersPage } from './pages/RemindersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import ProjectFormPage from './pages/ProjectFormPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  return (
    <ErrorBoundary title="Project Graveyard encountered a startup issue">
      <AppProvider>
        <ToastProvider>
          <StartupScreen />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <ErrorBoundary title="Application layout error">
                    <AppLayout />
                  </ErrorBoundary>
                }
              >
                <Route
                  index
                  element={
                    <ErrorBoundary title="Dashboard error">
                      <DashboardPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="projects"
                  element={
                    <ErrorBoundary title="Projects page error">
                      <ProjectsPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="projects/new"
                  element={
                    <ErrorBoundary title="New project editor error">
                      <ProjectFormPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="projects/:id/edit"
                  element={
                    <ErrorBoundary title="Project editor error">
                      <ProjectFormPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="projects/:id"
                  element={
                    <ErrorBoundary title="Project details error">
                      <ProjectDetailPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="revival-studio"
                  element={
                    <ErrorBoundary title="Revival Studio error">
                      <RevivalStudioPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="fusion"
                  element={
                    <ErrorBoundary title="Project Fusion error">
                      <FusionPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="fusion/proposal/:proposalId"
                  element={
                    <ErrorBoundary title="Fusion Proposal error">
                      <FusionProposalPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="project-fusion"
                  element={
                    <ErrorBoundary title="Project Fusion error">
                      <FusionPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="project-fusion/proposal/:proposalId"
                  element={
                    <ErrorBoundary title="Fusion Proposal error">
                      <FusionProposalPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="discover"
                  element={
                    <ErrorBoundary title="Discover community error">
                      <DiscoverPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <ErrorBoundary title="Profile page error">
                      <ProfilePage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="profile/:id"
                  element={
                    <ErrorBoundary title="Profile page error">
                      <ProfilePage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="teams"
                  element={
                    <ErrorBoundary title="Teams workspace error">
                      <TeamsPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="reminders"
                  element={
                    <ErrorBoundary title="Reminders page error">
                      <RemindersPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <ErrorBoundary title="Analytics page error">
                      <AnalyticsPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ErrorBoundary title="Settings page error">
                      <SettingsPage />
                    </ErrorBoundary>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
