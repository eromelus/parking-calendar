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

interface CalendarProps {
  className?: string;
}

export default function Calendar({ className = "" }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [dayData, setDayData] = useState<DayData[]>([]);
  const [orders, setOrders] = useState<WooOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        const fetchedOrders: WooOrder[] = await response.json();
        setOrders(fetchedOrders);

        // Process orders into day data
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
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        setError(errorMessage);
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

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