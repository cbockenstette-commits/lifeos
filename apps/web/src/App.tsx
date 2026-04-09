import { Routes, Route } from 'react-router-dom';
import { PageShell } from './components/layout/page-shell.js';
import DashboardPage from './pages/dashboard-page.js';
import AreasPage from './pages/areas-page.js';
import AreaDetailPage from './pages/area-detail-page.js';
import ProjectsPage from './pages/projects-page.js';
import ProjectDetailPage from './pages/project-detail-page.js';
import TasksPage from './pages/tasks-page.js';
import TaskDetailPage from './pages/task-detail-page.js';
import ResourcesPage from './pages/resources-page.js';
import ResourceDetailPage from './pages/resource-detail-page.js';
import SprintsPage from './pages/sprints-page.js';
import SprintDetailPage from './pages/sprint-detail-page.js';
import SprintPlanningPage from './pages/sprint-planning-page.js';
import TagsPage from './pages/tags-page.js';
import TagDetailPage from './pages/tag-detail-page.js';
import NotFoundPage from './pages/not-found-page.js';

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<PageShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="areas" element={<AreasPage />} />
        <Route path="areas/:id" element={<AreaDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="resources/:id" element={<ResourceDetailPage />} />
        <Route path="sprints" element={<SprintsPage />} />
        <Route path="sprints/:id" element={<SprintDetailPage />} />
        <Route path="sprints/:id/plan" element={<SprintPlanningPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="tags/:id" element={<TagDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
