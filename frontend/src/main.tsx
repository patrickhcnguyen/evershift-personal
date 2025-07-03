import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from './App.tsx';
import Index from './pages/Index.tsx';
import Schedule from './features/scheduling/schedule.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Employees from './pages/Employees.tsx';
import Communication from './pages/Communication.tsx';
import Timesheet from './pages/Timesheet.tsx';
import Invoicing from './pages/Invoicing.tsx';
import CreateInvoice from './pages/CreateInvoice.tsx';
import ViewInvoice from './pages/ViewInvoice.tsx';
import Recruit from './pages/Recruit.tsx';
import Settings from './pages/Settings.tsx';
import Login from './pages/Login.tsx';
import OnboardingForm from './components/OnboardingForm.tsx';
import MultiStepForm from './pages/Form/MultiStepForm.tsx';
import { mobileEmployeeRoutes } from './routes/mobileEmployeeRoutes';
import SignUpForm from './pages/Auth/signUp.tsx';
import SignInForm from './pages/Auth/signIn.tsx';
import { InvoiceCard } from './features/invoicing/components/InvoiceCard.tsx';
import './index.css';
import { CreateInvoiceForm } from './features/invoicing/components/CreateInvoiceForm.tsx';

// Create a client
const queryClient = new QueryClient();

// Create router configuration
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "signup",
        element: <SignUpForm />,
      },
      {
        path: "signin",
        element: <SignInForm />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "employees/*",
        element: <Employees />,
      },
      {
        path: "schedule",
        element: <Schedule />,
      },
      {
        path: "communication",
        element: <Communication />,
      },
      {
        path: "timesheet",
        element: <Timesheet />,
      },
      {
        path: "invoicing",
        element: <Invoicing />,
      },
      {
        path: "invoicing/create",
        element: <CreateInvoiceForm />,
      },
      {
        path: "invoicing/view",
        element: <ViewInvoice />,
      },
      {
        path: "invoicing/:id",
        element: <InvoiceCard />,
      },
      {
        path: "recruit",
        element: <Recruit />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "onboarding",
        element: <OnboardingForm />,
      },
      {
        path: "staffing-request",
        element: <MultiStepForm />,
      },
      mobileEmployeeRoutes,
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);