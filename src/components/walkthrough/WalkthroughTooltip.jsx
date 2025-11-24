import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WalkthroughTooltip({ step, stepNumber, totalSteps, onNext, onPrevious, onSkip }) {
  const placement = step.placement || "center";

  const getPositionClasses = () => {
    switch (placement) {
      case "center":
        return "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl";
      case "top":
        return "fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl";
      case "bottom":
        return "fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl";
      case "left":
        return "fixed top-1/2 left-8 transform -translate-y-1/2 w-full max-w-md";
      case "right":
        return "fixed top-1/2 right-8 transform -translate-y-1/2 w-full max-w-md";
      default:
        return "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl";
    }
  };

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onSkip}
      />

      {/* Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`${getPositionClasses()} z-[9999] px-4`}
        >
          <Card className="bg-white shadow-2xl border-2 border-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      Step {stepNumber} of {totalSteps}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-4 max-h-[60vh] overflow-y-auto">
              <div className="text-slate-700 leading-relaxed whitespace-pre-line mb-6">
                {step.content}
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={onPrevious}
                  disabled={stepNumber === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        idx === stepNumber - 1
                          ? "w-8 bg-blue-600"
                          : idx < stepNumber - 1
                          ? "w-2 bg-blue-300"
                          : "w-2 bg-slate-200"
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={onNext}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2"
                >
                  {stepNumber === totalSteps ? "Finish" : "Next"}
                  {stepNumber < totalSteps && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={onSkip}
                  className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Skip tutorial
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
}