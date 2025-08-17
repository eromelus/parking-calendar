"use client";
import { useEffect, useState } from "react";
import moment from "moment";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import OrderModal from "./OrderModal";
import StatsBar from "./StatsBar";
import ThirdPartyModal, { getThirdPartyBookings, ThirdPartyBooking } from "./ThirdPartyModal";

// Interfaces for WooCommerce data
interface MetaData {
  key: string;
  value: string;
}

interface LineItem {
  name: string;
  quantity: number;
  meta_data: MetaData[];
}

interface WooOrder {
  id: number;
  line_items: LineItem[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface DayData {
  date: string;
  carCount: number;
  occupancyPercentage: number;
  orders?: WooOrder[];
  thirdPartyBookings?: ThirdPartyBooking[];
}

interface SyncStatus {
  id: number;
  lastSyncAt: string;
  syncType: string;
  ordersProcessed: number;
  status: string;
}

interface CalendarProps {
  className?: string;
}

export default function Calendar({ className = "" }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showThirdPartyModal, setShowThirdPartyModal] = useState(false);

  useEffect(() => {
    loadCalendarData();
    checkSyncStatus();
  }, [currentMonth]);

  // Function to merge database data with third-party bookings
  const mergeWithThirdPartyData = (dbData: DayData[]): DayData[] => {
    const thirdPartyBookings = getThirdPartyBookings();
    
    // Group third-party bookings by date
    const thirdPartyByDate = new Map<string, ThirdPartyBooking[]>();
    thirdPartyBookings.forEach(booking => {
      const existing = thirdPartyByDate.get(booking.date) || [];
      existing.push(booking);
      thirdPartyByDate.set(booking.date, existing);
    });
    
    return dbData.map(day => {
      const dayThirdPartyBookings = thirdPartyByDate.get(day.date);
      if (dayThirdPartyBookings && dayThirdPartyBookings.length > 0) {
        const thirdPartyCarCount = dayThirdPartyBookings.reduce((sum, booking) => sum + booking.carCount, 0);
        const totalCarCount = day.carCount + thirdPartyCarCount;
        return {
          ...day,
          carCount: totalCarCount,
          occupancyPercentage: Math.round((totalCarCount / 115) * 100),
          thirdPartyBookings: dayThirdPartyBookings
        };
      }
      return day;
    });
  };

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = currentMonth.clone().startOf('month').subtract(1, 'month');
      const endDate = currentMonth.clone().endOf('month').add(2, 'months');
      
      // Use occupancy API as single source of truth
      const response = await fetch(
        `/api/occupancy?start_date=${startDate.format('YYYY-MM-DD')}&end_date=${endDate.format('YYYY-MM-DD')}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }
      
      const data: DayData[] = await response.json();
      
      // Merge with third-party bookings
      const mergedData = mergeWithThirdPartyData(data);
      setDayData(mergedData);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync');
      if (response.ok) {
        const status: SyncStatus = await response.json();
        setSyncStatus(status);
      }
    } catch (error) {
      console.warn('Failed to check sync status:', error);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      setSyncStatus(prev => prev ? { ...prev, status: 'running' } : null);
      
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'incremental' })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSyncStatus({ 
          id: 0,
          status: 'completed', 
          lastSyncAt: new Date().toISOString(),
          ordersProcessed: result.ordersProcessed,
          syncType: result.syncType
        });
        
        // Refresh calendar data after successful sync
        await loadCalendarData();
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(prev => prev ? { ...prev, status: 'failed' } : null);
    } finally {
      setSyncing(false);
    }
  };

  const handleDateClick = async (date: string) => {
    setSelectedDate(date);
    
    // Check if this date already has orders loaded
    const existingDayData = dayData.find(day => day.date === date);
    if (existingDayData?.orders) {
      return; // Orders already loaded
    }
    
    // Fetch orders for this specific date
    try {
      const response = await fetch(
        `/api/occupancy?start_date=${date}&end_date=${date}&include_orders=true`
      );
      
      if (response.ok) {
        const data: DayData[] = await response.json();
        const dayWithOrders = data[0];
        
        // Update the existing day data with orders
        setDayData(prevData => 
          prevData.map(day => 
            day.date === date 
              ? { ...day, orders: dayWithOrders.orders || [] }
              : day
          )
        );
      }
    } catch (error) {
      console.error('Failed to fetch orders for date:', date, error);
    }
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
  };

  const handleThirdPartyUpdate = () => {
    // Refresh calendar data to show updated third-party bookings
    loadCalendarData();
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'next' 
        ? moment(prev).add(1, 'month')
        : moment(prev).subtract(1, 'month')
    );
  };

  const selectedDayData = selectedDate 
    ? dayData.find(day => day.date === selectedDate)
    : null;

  const monthlyStats = {
    totalDays: dayData.filter(day => 
      moment(day.date).isSame(currentMonth, 'month')
    ).length,
    averageOccupancy: Math.round(
      dayData
        .filter(day => moment(day.date).isSame(currentMonth, 'month'))
        .reduce((sum, day) => sum + day.occupancyPercentage, 0) /
      Math.max(dayData.filter(day => 
        moment(day.date).isSame(currentMonth, 'month')
      ).length, 1)
    ),
    highOccupancyDays: dayData.filter(day => 
      moment(day.date).isSame(currentMonth, 'month') && day.occupancyPercentage > 80
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-7xl mx-auto ${className}`}>
      {/* Sync Status Indicator */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {syncStatus?.status === 'running' || syncing ? (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
              <span>Syncing data...</span>
            </div>
          ) : syncStatus?.status === 'failed' ? (
            <div className="text-red-600">
              Sync failed - using cached data
            </div>
          ) : syncStatus ? (
            <div className="text-green-600 text-sm">
              Last sync: {moment(syncStatus.lastSyncAt).fromNow()} 
              ({syncStatus.ordersProcessed} orders)
            </div>
          ) : null}
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowThirdPartyModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200"
          >
            Manage Third-Party
          </button>
          
          <button 
            onClick={handleManualSync}
            disabled={syncing || syncStatus?.status === 'running'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>
      
      <CalendarHeader
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        stats={monthlyStats}
      />
      
      <CalendarGrid
        currentMonth={currentMonth}
        dayData={dayData}
        onDateClick={handleDateClick}
      />
      
      <StatsBar stats={monthlyStats} />
      
      {selectedDate && selectedDayData && (
        <OrderModal
          date={selectedDate}
          dayData={selectedDayData}
          onClose={handleCloseModal}
        />
      )}

      {showThirdPartyModal && (
        <ThirdPartyModal
          onClose={() => setShowThirdPartyModal(false)}
          onUpdate={handleThirdPartyUpdate}
        />
      )}
    </div>
  );
}