# Parking Calendar App

A **Next.js 15** application that displays a parking calendar for cruise bookings at Jacksonville Port (JAXPORT). The app connects to a **WooCommerce API** to fetch completed orders and forecasts daily parking occupancy based on cruise durations.

**Occupancy Levels:**

- 🟩 Green: 0–57 cars (low)
- 🟨 Yellow: 58–92 cars (medium)
- 🟥 Red: 93–115 cars (high)

Features a **mobile-first responsive design** with an interactive modal that displays customer details when clicking on calendar dates.

---

## Features

- **WooCommerce Integration**: Fetches completed orders with parallel pagination for efficient data retrieval
- **Smart Data Processing**:
  - Extracts delivery dates via `_prdd_lite_date` meta field
  - Parses cruise durations from product names (e.g., "5-Night") to forecast parking occupancy
- **Interactive Calendar**: FullCalendar library with color-coded occupancy levels
- **Customer Details Modal**: Click any date to view customer information (name, email) in an interactive modal
- **Database Management**: Prisma ORM with MySQL for robust data handling
- **Third-party Booking System**: Comprehensive booking management capabilities
- **Health Monitoring**: Database connectivity health check endpoint
- **Mobile-first Design**: Responsive UI optimized for all device sizes
- **Error Handling**: Comprehensive error management throughout the application

---

## Prerequisites

- **Node.js** (Latest LTS version recommended)
- **MySQL Database** (Local or cloud-hosted like AWS RDS)
- **WooCommerce API Keys** (read-only)
  - Generate via: WooCommerce → Settings → Advanced → REST API

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

3. **Create `.env.local`** and add your credentials:

   ```env
   WC_CONSUMER_KEY=your_ck_key
   WC_CONSUMER_SECRET=your_cs_key
   DATABASE_URL="mysql://username:password@localhost:3306/your_database"
   ```

4. **Set up the database**:

   ```bash
   npm run db:generate    # Generate Prisma client
   npm run db:migrate     # Run database migrations
   ```

5. **Run locally**:

   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to see the calendar.

6. **Optional - View database**:

   ```bash
   npm run db:studio      # Open Prisma Studio for database management
   ```

---

## Deployment

- **Platform**: Deployed to Vercel with automatic builds
- **Database**: Migrated from local MySQL to AWS RDS for cloud scalability
- **Environment Variables**:

  - `WC_CONSUMER_KEY` and `WC_CONSUMER_SECRET` (WooCommerce API)
  - `DATABASE_URL` (MySQL connection string)

  All variables are securely stored in the Vercel dashboard.

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

## Technology Stack

- **Framework**: Next.js 15.4.4 with App Router
- **Runtime**: React 19.1.0
- **Language**: TypeScript 5
- **Database**: MySQL with Prisma ORM 6.13.0
- **Styling**: TailwindCSS 4
- **Calendar**: FullCalendar 6.1.18
- **Date Processing**: Moment.js 2.30.1
- **Linting**: ESLint 9 with Next.js config

## Recent Updates

- ✅ **Third-party booking management system** - Enhanced booking capabilities
- ✅ **Database health check endpoint** - Monitor connectivity and system status
- ✅ **TypeScript deployment fixes** - Resolved Vercel deployment issues
- ✅ **Cloud migration** - Migrated from local MySQL to AWS RDS for scalability
- ✅ **Car count optimization** - Fixed calculation issues and improved API performance
- ✅ **Modal UI implemented** - Customer data displays in interactive modal
- ✅ **Mobile-first responsive design** - Optimized for all device sizes
