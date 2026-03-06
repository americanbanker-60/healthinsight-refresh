import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Brain, TrendingUp, Newspaper, Briefcase, BarChart3, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Newspaper,
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
    title: "Newsletter Intelligence",
    description: "Automatically extract key insights, statistics, M&A deals, and funding rounds from any healthcare newsletter or article.",
  },
  {
    icon: TrendingUp,
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    title: "M&A Deal Tracking",
    description: "Track every merger, acquisition, and funding event across the healthcare landscape with structured, searchable data.",
  },
  {
    icon: Brain,
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-50",
    iconColor: "text-purple-600",
    title: "Trend Discovery",
    description: "Spot emerging themes and market signals before they become mainstream using AI-powered trend analysis.",
  },
  {
    icon: Briefcase,
    color: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
    title: "PE Meeting Prep",
    description: "Generate comprehensive meeting briefs on any company or sponsor in minutes — backed by real market intelligence.",
  },
];

export default function LandingPage() {
  const { data: authData, isFetched } = useQuery({
    queryKey: ["landing-auth"],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return { user, isAuthenticated: !!user };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  // Redirect authenticated users straight to the dashboard
  useEffect(() => {
    if (isFetched && authData?.isAuthenticated) {
      window.location.href = createPageUrl("Dashboard");
    }
  }, [isFetched, authData]);

  if (!isFetched || authData?.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-slate-100 sticky top-0 z-20 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691b51b50a00afcaf6fc0e9a/463ae1a89_image.png"
              alt="HealthInsight Logo"
              className="w-9 h-9 object-contain"
            />
            <span className="font-bold text-slate-900 text-lg tracking-tight">HealthInsight</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-slate-600 hover:text-slate-900"
              onClick={() => base44.auth.redirectToLogin()}
            >
              Sign In
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => base44.auth.redirectToLogin()}
            >
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-blue-50/60 to-white">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
          <BarChart3 className="w-3.5 h-3.5" />
          Healthcare Investment Intelligence
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight max-w-3xl mb-6">
          Stay ahead of every{" "}
          <span className="text-blue-600">healthcare deal</span> and trend.
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl leading-relaxed mb-10">
          HealthInsight transforms healthcare newsletters and market data into structured, actionable intelligence — so you never miss a signal that matters.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base rounded-xl shadow-lg shadow-blue-200"
            onClick={() => base44.auth.redirectToLogin()}
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-8 py-6 text-base rounded-xl border-slate-200 hover:bg-slate-50"
            onClick={() => base44.auth.redirectToLogin()}
          >
            Sign In
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to track healthcare markets
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Purpose-built for healthcare investors, bankers, and operators who need reliable intelligence fast.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-slate-100 bg-slate-50/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof / benefits strip */}
      <section className="py-14 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
          {[
            "AI-powered extraction from any URL or PDF",
            "Structured M&A and funding data",
            "Saved searches & personal library",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="text-slate-700 font-medium">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to gain an edge?
        </h2>
        <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
          Join healthcare professionals who rely on HealthInsight to stay informed and act faster.
        </p>
        <Button
          size="lg"
          className="bg-white text-blue-700 hover:bg-blue-50 px-10 py-6 text-base rounded-xl font-semibold shadow-xl"
          onClick={() => base44.auth.redirectToLogin()}
        >
          Get Started
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-400">© {new Date().getFullYear()} HealthInsight. All rights reserved.</p>
      </footer>
    </div>
  );
}