import React, { createContext, useContext, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import WalkthroughTooltip from "./WalkthroughTooltip";
import { walkthroughSteps } from "./walkthroughSteps";

const WalkthroughContext = createContext();

export function useWalkthrough() {
  return useContext(WalkthroughContext);
}

export function WalkthroughProvider({ children }) {
  const [currentStep, setCurrentStep] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const queryClient = useQueryClient();

  const { data: progress } = useQuery({
    queryKey: ['walkthroughProgress'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        const existing = await base44.entities.UserWalkthroughProgress.filter({
          created_by: user.email
        });
        return existing[0] || null;
      } catch {
        return null;
      }
    },
    staleTime: 300000, // 5 minutes
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (progress) {
        return await base44.entities.UserWalkthroughProgress.update(progress.id, data);
      } else {
        return await base44.entities.UserWalkthroughProgress.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['walkthroughProgress']);
    },
  });

  const startWalkthrough = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < walkthroughSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeWalkthrough();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipWalkthrough = () => {
    setIsActive(false);
    setCurrentStep(null);
    saveMutation.mutate({
      completed: false,
      skipped: true,
      last_step_completed: currentStep
    });
  };

  const completeWalkthrough = () => {
    setIsActive(false);
    setCurrentStep(null);
    saveMutation.mutate({
      completed: true,
      skipped: false,
      last_step_completed: walkthroughSteps.length - 1
    });
  };

  const resetWalkthrough = () => {
    if (progress) {
      saveMutation.mutate({
        completed: false,
        skipped: false,
        last_step_completed: 0
      });
    }
    setCurrentStep(null);
    setIsActive(false);
  };

  const currentStepData = isActive && currentStep !== null ? walkthroughSteps[currentStep] : null;
  const shouldShowOnboarding = !progress || (!progress.completed && !progress.skipped);

  // Auto-start walkthrough for first-time users
  React.useEffect(() => {
    if (shouldShowOnboarding && !isActive && progress !== null && progress !== undefined) {
      const timer = setTimeout(() => {
        startWalkthrough();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowOnboarding, isActive, progress]);

  return (
    <WalkthroughContext.Provider
      value={{
        isActive,
        currentStep,
        currentStepData,
        totalSteps: walkthroughSteps.length,
        startWalkthrough,
        nextStep,
        previousStep,
        skipWalkthrough,
        completeWalkthrough,
        resetWalkthrough,
        shouldShowOnboarding,
        hasCompletedWalkthrough: progress?.completed || false
      }}
    >
      {children}
      {isActive && currentStepData && (
        <WalkthroughTooltip
          step={currentStepData}
          stepNumber={currentStep + 1}
          totalSteps={walkthroughSteps.length}
          onNext={nextStep}
          onPrevious={previousStep}
          onSkip={skipWalkthrough}
        />
      )}
    </WalkthroughContext.Provider>
  );
}