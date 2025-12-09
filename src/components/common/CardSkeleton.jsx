import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Reusable loading skeleton for card layouts
 */
export function CardSkeleton({ count = 1 }) {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-3" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function GridCardSkeleton({ count = 6 }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CardSkeleton count={count} />
    </div>
  );
}