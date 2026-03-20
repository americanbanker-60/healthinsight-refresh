import React, { createContext, useContext, useState, useCallback } from "react";

const AIStatusContext = createContext(null);

export function AIStatusProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const startAgent = useCallback(() => {
    setIsRunning(true);
    setProgress(15);
  }, []);

  const tickProgress = useCallback((value) => {
    setProgress(value);
  }, []);

  const stopAgent = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      setIsRunning(false);
      setProgress(0);
    }, 400);
  }, []);

  return (
    <AIStatusContext.Provider value={{ isRunning, progress, startAgent, tickProgress, stopAgent }}>
      {children}
    </AIStatusContext.Provider>
  );
}

export function useAIStatus() {
  const ctx = useContext(AIStatusContext);
  if (!ctx) throw new Error("useAIStatus must be used within AIStatusProvider");
  return ctx;
}