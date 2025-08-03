# Parking Calendar App

This is a **Next.js** application that connects to a **WooCommerce API** to display a calendar of parking lot bookings for cruises at Jacksonville Port (JAXPORT).  
It forecasts daily occupancy based on cruise durations, with color-coded levels:

- 🟩 Green: 0–57 cars (low)
- 🟨 Yellow: 58–92 cars (medium)
- 🟥 Red: 93–115 cars (high)

Features a **mobile-first responsive design** with an interactive modal that displays customer details when clicking on calendar dates.  

---

## Features

- Fetches **completed orders** from WooCommerce with parallel pagination
- Processes:
  - Delivery dates via `_prdd_lite_date` meta field
  - Cruise durations (e.g., `"5-Night"`) to forecast parking occupancy
- FullCalendar UI with **color-coded occupancy levels**
- **Interactive modal UI** that displays customer info (name, email) when clicking dates
- **Mobile-first responsive design** with modern styling
- **Error handling** 

---

## Prerequisites

- WooCommerce API keys (read-only)
  - Generate via: WooCommerce → Settings → Advanced → REST API
- Node.js installed

---

## Setup

1. **Clone the repo**:

    ```bash
    git clone https://github.com/eromelus/parking-calendar.git
    cd parking-calendar
    ```

2. **Install dependencies**:

    ```bash
    npm install
    ```

3. **Create `.env.local`** and add your WooCommerce credentials:

    ```env
    WC_CONSUMER_KEY=your_ck_key
    WC_CONSUMER_SECRET=your_cs_key
    ```

4. **Run locally**:

    ```bash
    npm run dev
    ```

    Visit [http://localhost:3000](http://localhost:3000) to see the calendar.

---

## Deployment

- **Deployed to Vercel**:  
  [Insert Vercel URL here, e.g., `https://parking-calendar.vercel.app`]

- **Environment Variables**:  
  `WC_CONSUMER_KEY` and `WC_CONSUMER_SECRET` are securely stored in the Vercel dashboard.

---

## Usage

- Bookings load automatically from WooCommerce
- Click on a date to view that day's orders/customers in an interactive modal window
- Modal displays customer names and emails with scrollable content
- **Color key**:
  - 🟩 Green: 0–57 cars
  - 🟨 Yellow: 58–92 cars
  - 🟥 Red: 93–115 cars
- **Responsive design** optimized for mobile and desktop viewing

---

## Recent Updates

- ✅ **Modal UI implemented** - Customer data now displays in an interactive modal instead of console
- ✅ **Mobile-first responsive design** - Redesigned interface optimized for all device sizes
- ✅ **Enhanced user experience** - Scrollable modal with improved typography and contrast

## Future Improvements

- Improve performance with **caching**
- Add filtering and search capabilities
- Export functionality for booking data
