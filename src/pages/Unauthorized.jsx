import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Home } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60 mt-20">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Access Denied</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            You don't have permission to access this page. This area is restricted to administrators only.
          </p>
          
          <Link to={createPageUrl("Dashboard")}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Home className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}