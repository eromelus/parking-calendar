"use client";

interface StatsBarProps {
  stats: {
    totalDays: number;
    averageOccupancy: number;
    highOccupancyDays: number;
  };
}

export default function StatsBar({ stats }: StatsBarProps) {
  const getOccupancyColor = (percentage: number) => {
    if (percentage <= 50) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage <= 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Summary</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Booking Days */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg mx-auto mb-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h6M8 7V3a2 2 0 012-2h6M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2M8 7V3a2 2 0 012-2h6" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalDays}
          </div>
          <div className="text-sm text-gray-600">
            Booking Days
          </div>
        </div>

        {/* Average Occupancy */}
        <div className="text-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-lg mx-auto mb-2 border ${getOccupancyColor(stats.averageOccupancy)}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className={`text-2xl font-bold ${getOccupancyColor(stats.averageOccupancy).split(' ')[0]}`}>
            {stats.averageOccupancy}%
          </div>
          <div className="text-sm text-gray-600">
            Avg Occupancy
          </div>
        </div>

        {/* High Occupancy Days */}
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-red-50 border border-red-200 rounded-lg mx-auto mb-2">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {stats.highOccupancyDays}
          </div>
          <div className="text-sm text-gray-600">
            High Demand Days
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Low Demand (≤50%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span>Medium Demand (51-80%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span>High Demand (81%+)</span>
          </div>
        </div>
      </div>
    </div>
  );
}