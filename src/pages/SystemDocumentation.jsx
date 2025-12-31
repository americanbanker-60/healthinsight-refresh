import React, { useState } from "react";
import { RoleGuard } from "../components/auth/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Code, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Database,
  Layers,
  Users,
  Settings,
  Zap
} from "lucide-react";
import SystemArchitecture from "../components/documentation/SystemArchitecture";
import FeaturesWorkflows from "../components/documentation/FeaturesWorkflows";
import FeatureStatus from "../components/documentation/FeatureStatus";
import TechnicalImplementation from "../components/documentation/TechnicalImplementation";
import OperationsMaintenance from "../components/documentation/OperationsMaintenance";

export default function SystemDocumentation() {
  const [activeTab, setActiveTab] = useState("architecture");

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">
            System Documentation
          </h1>
          <p className="text-slate-600 text-lg">
            Comprehensive technical documentation for HealthInsight Intelligence Platform
          </p>
          <div className="flex gap-2 mt-4">
            <Badge className="bg-blue-100 text-blue-800">
              <BookOpen className="w-4 h-4 mr-2" />
              Single Source of Truth
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-4 h-4 mr-2" />
              Developer Onboarding
            </Badge>
            <Badge className="bg-purple-100 text-purple-800">
              <Code className="w-4 h-4 mr-2" />
              Implementation Guide
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white border border-slate-200">
            <TabsTrigger value="architecture">
              <Layers className="w-4 h-4 mr-2" />
              Architecture
            </TabsTrigger>
            <TabsTrigger value="features">
              <Zap className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger value="status">
              <CheckCircle className="w-4 h-4 mr-2" />
              Status
            </TabsTrigger>
            <TabsTrigger value="technical">
              <Code className="w-4 h-4 mr-2" />
              Technical
            </TabsTrigger>
            <TabsTrigger value="operations">
              <Settings className="w-4 h-4 mr-2" />
              Operations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="architecture">
            <SystemArchitecture />
          </TabsContent>

          <TabsContent value="features">
            <FeaturesWorkflows />
          </TabsContent>

          <TabsContent value="status">
            <FeatureStatus />
          </TabsContent>

          <TabsContent value="technical">
            <TechnicalImplementation />
          </TabsContent>

          <TabsContent value="operations">
            <OperationsMaintenance />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}