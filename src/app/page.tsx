"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((orders: WooOrder[]) => {
        const bookings: { [date: string]: number } = {};
        orders.forEach((order: any) => {
          order.line_items.forEach((item: any) => {
            const startDate = item.meta_data.find(
              (m: any) => m.key === "_prdd_lite_date"
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
            title: `${count} cars`,
            start: date,
            allDay: true,
          })
        );
        setEvents(calendarEvents);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading orders...</p>;

  return (
    <div>
      <h1>Parking Calendar (Events: {events.length})</h1>
      <pre>{JSON.stringify(events, null, 2)}</pre>{" "}
      {/* Temp display for checkpoint */}
    </div>
  );
}
