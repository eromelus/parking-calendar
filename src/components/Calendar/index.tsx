"use client";
import { useEffect, useState } from "react";
import moment from "moment";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import OrderModal from "./OrderModal";
import StatsBar from "./StatsBar";

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
  orders: WooOrder[];
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

  useEffect(() => {
    loadCalendarData();
    checkSyncStatus();
  }, [currentMonth]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = currentMonth.clone().startOf('month').subtract(1, 'month');
      const endDate = currentMonth.clone().endOf('month').add(2, 'months');
      
      // Try to use optimized occupancy API first
      try {
        const response = await fetch(
          `/api/occupancy?start_date=${startDate.format('YYYY-MM-DD')}&end_date=${endDate.format('YYYY-MM-DD')}`
        );
        
        if (response.ok) {
          const data: DayData[] = await response.json();
          setDayData(data);
          setError(null);
          return;
        }
      } catch (occupancyError) {
        console.warn('Occupancy API failed, falling back to orders API');
      }
      
      // Fallback to orders API with client-side processing
      const response = await fetch(
        `/api/orders?start_date=${startDate.format('YYYY-MM-DD')}&end_date=${endDate.format('YYYY-MM-DD')}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch calendar data");
      }
      
      const fetchedOrders: WooOrder[] = await response.json();

      // Process orders into day data (existing logic)
      const bookings: { [date: string]: { count: number; orders: WooOrder[] } } = {};
      
      fetchedOrders.forEach((order: WooOrder) => {
        order.line_items.forEach((item: LineItem) => {
          const startDate = item.meta_data.find(
            (m: MetaData) => m.key === "_prdd_lite_date"
          )?.value;
          const nightsMatch = item.name.match(/(\d+)-Night/);
          const nights = nightsMatch ? parseInt(nightsMatch[1]) : 0;
          const duration = nights + 1;
          
          if (startDate) {
            for (let i = 0; i < duration; i++) {
              const dateKey = moment(startDate)
                .add(i, "days")
                .format("YYYY-MM-DD");
              
              if (!bookings[dateKey]) {
                bookings[dateKey] = { count: 0, orders: [] };
              }
              bookings[dateKey].count += item.quantity;
              
              // Add order to this date if not already included
              const orderExists = bookings[dateKey].orders.some(o => o.id === order.id);
              if (!orderExists) {
                bookings[dateKey].orders.push(order);
              }
            }
          }
        });
      });

      // Convert to DayData array
      const processedDayData: DayData[] = Object.entries(bookings).map(
        ([date, data]) => ({
          date,
          carCount: data.count,
          occupancyPercentage: Math.round((data.count / 115) * 100),
          orders: data.orders,
        })
      );

      setDayData(processedDayData);
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

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
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
        
        <button 
          onClick={handleManualSync}
          disabled={syncing || syncStatus?.status === 'running'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
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
    </div>
  );
}