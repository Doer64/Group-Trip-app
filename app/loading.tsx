import React from 'react';
import { FlightLoader } from '@/components/ui/FlightLoader';

export default function RootLoading() {
  return (
    <div className="min-h-[55vh] flex items-center justify-center">
      <FlightLoader
        label="Preparing for departure..."
        sublabel="Tuning flight radar and loading group ballot"
      />
    </div>
  );
}
