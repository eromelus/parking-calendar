"use client";
import moment, { Moment } from "moment";
import DayCard from "./DayCard";

interface DayData {
  date: string;
  carCount: number;
  occupancyPercentage: number;
  orders: any[];
}

interface CalendarGridProps {
  currentMonth: Moment;
  dayData: DayData[];
  onDateClick: (date: string) => void;
}

export default function CalendarGrid({ 
  currentMonth, 
  dayData, 
  onDateClick 
}: CalendarGridProps) {
  // Generate calendar days for the current month view
  const generateCalendarDays = () => {
    const startOfMonth = moment(currentMonth).startOf('month');
    const endOfMonth = moment(currentMonth).endOf('month');
    const startOfCalendar = moment(startOfMonth).startOf('week');
    const endOfCalendar = moment(endOfMonth).endOf('week');
    
    const days: string[] = [];
    const current = moment(startOfCalendar);
    
    while (current.isSameOrBefore(endOfCalendar)) {
      days.push(current.format('YYYY-MM-DD'));
      current.add(1, 'day');
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const today = moment().format('YYYY-MM-DD');

  // Create a lookup map for day data
  const dayDataMap = dayData.reduce((acc, day) => {
    acc[day.date] = day;
    return acc;
  }, {} as { [key: string]: DayData });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div 
            key={day} 
            className="text-center text-sm font-semibold text-gray-600 py-2"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid - Responsive Layout */}
      
      {/* Mobile: Single Column Stack */}
      <div className="block sm:hidden space-y-2">
        {calendarDays
          .filter(date => moment(date).isSame(currentMonth, 'month'))
          .map((date) => {
            const isCurrentMonth = moment(date).isSame(currentMonth, 'month');
            const isToday = date === today;
            const dayInfo = dayDataMap[date];

            return (
              <div key={date} className="flex items-center space-x-3 p-2 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0 w-12 text-center">
                  <div className="text-sm font-semibold text-gray-900">
                    {moment(date).format('MMM')}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {moment(date).format('D')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {moment(date).format('ddd')}
                  </div>
                </div>
                
                <div className="flex-grow">
                  <DayCard
                    date={date}
                    dayData={dayInfo}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday}
                    onClick={onDateClick}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* Tablet: 2-3 Column Grid */}
      <div className="hidden sm:block lg:hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {calendarDays.map((date) => {
            const isCurrentMonth = moment(date).isSame(currentMonth, 'month');
            const isToday = date === today;
            const dayInfo = dayDataMap[date];

            if (!isCurrentMonth) return null;

            return (
              <DayCard
                key={date}
                date={date}
                dayData={dayInfo}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                onClick={onDateClick}
              />
            );
          })}
        </div>
      </div>

      {/* Desktop: Traditional 7-Column Grid */}
      <div className="hidden lg:grid grid-cols-7 gap-2">
        {calendarDays.map((date) => {
          const isCurrentMonth = moment(date).isSame(currentMonth, 'month');
          const isToday = date === today;
          const dayInfo = dayDataMap[date];

          return (
            <DayCard
              key={date}
              date={date}
              dayData={dayInfo}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              onClick={onDateClick}
            />
          );
        })}
      </div>
    </div>
  );
}