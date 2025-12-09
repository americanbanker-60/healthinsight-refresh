import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

/**
 * Reusable date range picker component
 * Displays two calendar popovers for start and end date selection
 */
export default function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? format(new Date(startDate), 'MMM d, yyyy') : 'Start date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={startDate ? new Date(startDate) : undefined}
            onSelect={(date) => onStartDateChange(date?.toISOString())}
          />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {endDate ? format(new Date(endDate), 'MMM d, yyyy') : 'End date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={endDate ? new Date(endDate) : undefined}
            onSelect={(date) => onEndDateChange(date?.toISOString())}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}