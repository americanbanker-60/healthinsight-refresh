import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function FeaturedTopicsSection() {
  const { data: featuredTopics = [], isLoading } = useQuery({
    queryKey: ['featuredTopics'],
    queryFn: async () => {
      // Fetch all analyzed newsletters
      const newsletters = await base44.entities.NewsletterItem.filter(
        { is_analyzed: true },
        '-created_date',
        10000
      );

      // Count theme frequency
      const themeFrequency = {};
      newsletters.forEach(n => {
        if (n.themes && Array.isArray(n.themes)) {
          n.themes.forEach(t => {
            if (t && t.theme) {
              themeFrequency[t.theme] = (themeFrequency[t.theme] || 0) + 1;
            }
          });
        }
      });

      // Sort by frequency and return top 6
      return Object.entries(themeFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([theme, count]) => ({ theme, count }));
    },
    initialData: [],
  });

  if (isLoading) {
    return (
      <Card className="mb-8 bg-white/80 backdrop-blur-sm shadow-lg border-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            Featured Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (featuredTopics.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Featured Topics
        </CardTitle>
        <CardDescription>
          Top themes across {featuredTopics.reduce((sum, t) => sum + t.count, 0)} analyzed newsletters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {featuredTopics.map((topic, index) => (
            <motion.div
              key={topic.theme}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0"
            >
              <Badge 
                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-sm font-medium cursor-pointer transition-all hover:shadow-md whitespace-nowrap"
                title={topic.theme}
              >
                <span className="max-w-xs truncate">{topic.theme}</span>
                <span className="ml-2 bg-amber-500 px-2 py-0.5 rounded-full text-xs font-bold">
                  {topic.count}
                </span>
              </Badge>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}