import { Routes, Route } from 'react-router-dom';
import { PageShell } from './components/layout/page-shell.js';
import DashboardPage from './pages/dashboard-page.js';
import AreasPage from './pages/areas-page.js';
import ProjectsPage from './pages/projects-page.js';
import TasksPage from './pages/tasks-page.js';
import ResourcesPage from './pages/resources-page.js';
import SprintsPage from './pages/sprints-page.js';
import TagsPage from './pages/tags-page.js';
import NotFoundPage from './pages/not-found-page.js';

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<PageShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="areas" element={<AreasPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="sprints" element={<SprintsPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
