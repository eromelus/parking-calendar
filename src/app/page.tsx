"use client";
import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import moment from "moment";

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
  line_items: LineItem[];
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        const orders: WooOrder[] = await response.json(); // Direct array from API
        const bookings: { [date: string]: number } = {};
        orders.forEach((order: WooOrder) => {
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
                bookings[dateKey] = (bookings[dateKey] || 0) + item.quantity;
              }
            }
          });
        });
        const calendarEvents = Object.entries(bookings).map(
          ([date, count]) => ({
            title: `${count} cars (of 115)`,
            start: date,
            allDay: true,
            color: count > 92 ? "red" : count > 50 ? "yellow" : "green", // Occupancy colors
          })
        );
        setEvents(calendarEvents);
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

  if (loading) return <p>Loading orders...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <h1>Parking Lot Booking Calendar</h1>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventContent={({ event }) => <b>{event.title}</b>}
      />
    </div>
  );
}
