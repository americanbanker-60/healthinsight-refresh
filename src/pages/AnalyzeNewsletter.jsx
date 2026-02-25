import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnalyzeNewsletterForm from "../components/source/AnalyzeNewsletterForm";
import { toast } from "sonner";

export default function AnalyzeNewsletter() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    toast.success("Newsletter analyzed successfully!");
    navigate(createPageUrl("Dashboard"));
  };

  const handleCancel = () => {
    navigate(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-6 hover:bg-white/60"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Analyze Newsletter</h1>
              <p className="text-slate-600">Submit URLs or PDFs for AI-powered healthcare intelligence extraction</p>
            </div>
          </div>
        </div>

        <AnalyzeNewsletterForm
          sourceName="Direct Upload"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}