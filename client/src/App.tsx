import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import Plan from "./pages/Plan";
import Review from "./pages/Review";
import LifeAreas from "./pages/LifeAreas";
import AreaDetail from "./pages/AreaDetail";
import GoalDetail from "./pages/GoalDetail";
import ProjectDetail from "./pages/ProjectDetail";
import Tasks from "./pages/Tasks";
import Goals from "./pages/Goals";
import Projects from "./pages/Projects";
import Habits from "./pages/Habits";
import Books from "./pages/Books";
import Plans from "./pages/Plans";
import Calendar from "./pages/Calendar";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import AIAssistant from "./pages/AIAssistant";
import Login, { isAuthenticated } from "./pages/Login";

import DashboardLayout from "./components/DashboardLayout";

function Router() {
  const [location, setLocation] = useLocation();
  const authed = isAuthenticated();

  useEffect(() => {
    if (!authed && location !== "/") {
      setLocation("/");
    } else if (authed && location === "/") {
      setLocation("/dashboard");
    }
  }, [authed, location, setLocation]);

  if (!authed && location !== "/") {
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route>
        <DashboardLayout>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/today" component={Today} />
            <Route path="/plan" component={Plan} />
            <Route path="/review" component={Review} />
            <Route path="/life-areas" component={LifeAreas} />
            <Route path="/life-areas/:id" component={AreaDetail} />
            <Route path="/tasks" component={Tasks} />
            <Route path="/goals" component={Goals} />
            <Route path="/goals/:id" component={GoalDetail} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/habits" component={Habits} />
            <Route path="/books" component={Books} />
            <Route path="/plans" component={Plans} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/statistics" component={Statistics} />
            <Route path="/settings" component={Settings} />
            <Route path="/ai-assistant" component={AIAssistant} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
