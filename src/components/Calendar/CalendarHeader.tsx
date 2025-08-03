"use client";
import moment, { Moment } from "moment";

interface CalendarHeaderProps {
  currentMonth: Moment;
  onMonthChange: (direction: 'prev' | 'next') => void;
  stats: {
    totalDays: number;
    averageOccupancy: number;
    highOccupancyDays: number;
  };
}

export default function CalendarHeader({ 
  currentMonth, 
  onMonthChange, 
  stats 
}: CalendarHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      {/* Title and Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onMonthChange('prev')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 touch-manipulation"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {currentMonth.format('MMMM YYYY')}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Parking Calendar - JAXPORT
          </p>
        </div>
        
        <button
          onClick={() => onMonthChange('next')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200 touch-manipulation"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Capacity Info */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2v-2a2 2 0 00-2-2H8z" />
          </svg>
          Total Capacity: 115 cars
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-gray-700">Low (0-50%)</span>
        </div>
        
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-gray-700">Medium (51-80%)</span>
        </div>
        
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full mr-2 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-gray-700">High (81%+)</span>
        </div>
      </div>
    </div>
  );
}