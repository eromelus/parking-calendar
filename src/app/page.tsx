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
  id: number; // Added for logging
  line_items: LineItem[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<WooOrder[]>([]); // New state for raw orders
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // State for modal

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        const fetchedOrders: WooOrder[] = await response.json(); // Direct array from API
        setOrders(fetchedOrders); // Save raw orders
        const bookings: { [date: string]: number } = {};
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
      <h1>Parking Lot Booking Calendar - {new Date().toLocaleDateString()}</h1>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventContent={({ event }) => <b>{event.title}</b>}
        eventClick={(info) => {
          const clickedDate = info.event.startStr;
          setSelectedDate(clickedDate); // Open modal
          const matchingOrders = orders
            .filter((order: WooOrder) => {
              return order.line_items.some((item: LineItem) => {
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
                    if (dateKey === clickedDate) return true;
                  }
                }
                return false;
              });
            })
            .map((order) => ({
              id: order.id,
              customer: `${order.billing.first_name} ${order.billing.last_name}`,
              email: order.billing.email,
              phone: order.billing.phone,
              cars: order.line_items.reduce(
                (sum, item) => sum + item.quantity,
                0
              ),
            }));
          console.log(`Orders for ${clickedDate}:`, matchingOrders);
        }}
      />
      {selectedDate && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "20px",
            border: "1px solid black",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "5px",
            }}
          >
            <button
              onClick={() => setSelectedDate(null)}
              style={{ fontWeight: "bold", fontSize: "1.2rem" }}
            >
              Close
            </button>
          </div>
          <h2>Orders for {selectedDate}</h2>
          <ul>
            {orders
              .filter((order: WooOrder) => {
                return order.line_items.some((item: LineItem) => {
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
                      if (dateKey === selectedDate) return true;
                    }
                  }
                  return false;
                });
              })
              .map((order: WooOrder) => (
                <li key={order.id}>
                  ID: {order.id} - {order.billing.first_name}{" "}
                  {order.billing.last_name} ({order.billing.email},{" "}
                  {order.billing.phone}) -{" "}
                  {order.line_items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )}{" "}
                  cars
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
