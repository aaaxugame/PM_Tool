import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/authContext'
import Layout from './components/Layout'
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import AdminPage from './pages/Admin/AdminPage'
import ProjectsPage from './pages/Projects/ProjectsPage'
import ProjectDetailPage from './pages/Projects/ProjectDetailPage'
import TasksPage from './pages/Tasks/TasksPage'
import TimeTrackingPage from './pages/TimeTracking/TimeTrackingPage'
import InvoicesPage from './pages/Invoices/InvoicesPage'
import InvoiceDetailPage from './pages/Invoices/InvoiceDetailPage'
import ReportsPage from './pages/Reports/ReportsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="time-tracking" element={<TimeTrackingPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
