import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/context/AppContext";
import { WebSocketProvider, useWebSocketContext } from "@/context/WebSocketContext";
import { ProjectsProvider } from "@/context/ProjectsContext";
import LoadingScreen from "@/components/LoadingScreen";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Module-level flag survives HMR remounts of child components
let APP_BOOTED_ONCE = false;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function BootDismissHandler({ onDismiss }: { onDismiss: () => void }) {
  const { connected } = useWebSocketContext();
  useEffect(() => {
    if (connected) {
      onDismiss();
    }
  }, [connected, onDismiss]);
  return null;
}

function App() {
  const [booted, setBooted] = useState(() =>
    APP_BOOTED_ONCE || new URLSearchParams(window.location.search).has("noboot")
  );

  const handleBootDone = () => {
    APP_BOOTED_ONCE = true;
    setBooted(true);
  };

  return (
    <>
      {!booted && <LoadingScreen onDismiss={handleBootDone} />}
      {booted && <button data-testid="button-enter-interface" style={{ display: 'none' }} />}
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <WebSocketProvider>
            {!booted && <BootDismissHandler onDismiss={handleBootDone} />}
            <ProjectsProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </ProjectsProvider>
          </WebSocketProvider>
        </AppProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;