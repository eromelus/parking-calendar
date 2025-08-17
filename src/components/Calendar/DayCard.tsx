"use client";
import moment from "moment";

interface DayData {
  date: string;
  carCount: number;
  occupancyPercentage: number;
  orders?: any[];
}

interface DayCardProps {
  date: string;
  dayData?: DayData;
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: (date: string) => void;
}

export default function DayCard({ 
  date, 
  dayData, 
  isCurrentMonth, 
  isToday, 
  onClick 
}: DayCardProps) {
  const dayNumber = moment(date).format('D');
  const hasData = dayData && dayData.carCount > 0;
  
  // Determine background color based on occupancy
  const getBackgroundColor = () => {
    if (!hasData) return 'bg-gray-50 hover:bg-gray-100';
    
    const occupancy = dayData.occupancyPercentage;
    if (occupancy <= 50) return 'bg-green-50 hover:bg-green-100 border-green-200';
    if (occupancy <= 80) return 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200';
    return 'bg-red-50 hover:bg-red-100 border-red-200';
  };

  const getTextColor = () => {
    if (!isCurrentMonth) return 'text-gray-400';
    if (isToday) return 'text-blue-600 font-bold';
    return 'text-gray-900';
  };

  const getOccupancyIcon = () => {
    if (!hasData) return null;
    
    const occupancy = dayData.occupancyPercentage;
    if (occupancy <= 50) {
      return (
        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    if (occupancy <= 80) {
      return (
        <svg className="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <button
      onClick={() => onClick(date)}
      className={`
        relative w-full min-h-[80px] sm:min-h-[100px] p-3 rounded-lg border-2 
        transition-all duration-200 touch-manipulation
        ${getBackgroundColor()}
        ${isCurrentMonth ? 'border-gray-200' : 'border-gray-100'}
        ${hasData ? 'border-opacity-50' : ''}
        ${isToday ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        active:scale-95 transform
      `}
      disabled={!isCurrentMonth}
      aria-label={`${moment(date).format('MMMM D, YYYY')}${hasData ? ` - ${dayData.carCount} cars, ${dayData.occupancyPercentage}% occupancy` : ' - No bookings'}`}
    >
      {/* Day Number */}
      <div className={`text-lg font-semibold ${getTextColor()}`}>
        {dayNumber}
      </div>
      
      {/* Occupancy Info */}
      {hasData && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-center space-x-1">
            {getOccupancyIcon()}
            <span className="text-xs font-medium text-gray-700">
              {dayData.occupancyPercentage}%
            </span>
          </div>
          
          <div className="text-xs text-gray-600">
            {dayData.carCount} car{dayData.carCount !== 1 ? 's' : ''}
          </div>
          
          {dayData.orders && (
            <div className="text-xs text-gray-500">
              {dayData.orders.length} order{dayData.orders.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
      
      {/* Empty State */}
      {!hasData && isCurrentMonth && (
        <div className="mt-2 text-xs text-gray-400">
          Available
        </div>
      )}
      
      {/* Today Indicator */}
      {isToday && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}
    </button>
  );
}