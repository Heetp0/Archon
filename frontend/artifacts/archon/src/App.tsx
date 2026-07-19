import React, { useState, useEffect } from "react";
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


interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback flex flex-col items-center justify-center h-screen bg-[#020617] text-text-primary p-6 font-mono">
          <h2 className="text-sm font-bold text-accent-rose mb-2">Something went wrong</h2>
          <p className="text-xs text-text-secondary mb-4 max-w-md text-center">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-text-primary transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}


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
                  <ErrorBoundary>
                    <Router />
                  </ErrorBoundary>
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