# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Before starting work

- Always in plan mode to make a plan
- After get the plan, make sure you Write the plan to .claude/tasks/TASK_NAME.md.
- The plan should be a detailed implementation plan and the reasoning behind them, as well as tasks broken down.
- If the task require external knowledge or certain package, also research to get latest knowledge (Use Task tool for research)
- Don’t over plan it, always think MVP.
- Once you write the plan, firstly ask me to review it. Do not continue until I approve the plan.

### While implementing

- You should update the plan as you work.
- After you complete tasks in the plan, you should update and append detailed descriptions of the changes you made, so following tasks can be easily hand over to other engineers.

## Project Overview

This is a Next.js 15 application that displays a parking calendar for cruise bookings at Jacksonville Port (JAXPORT). The app connects to a WooCommerce API to fetch completed orders and forecasts daily parking occupancy based on cruise durations.

## Architecture

### Core Components

- **Frontend**: React 19 with Next.js 15 App Router, TypeScript, and TailwindCSS
- **Calendar**: FullCalendar library with day grid view for displaying booking data
- **API Integration**: WooCommerce REST API v3 for fetching order data
- **Date Processing**: Moment.js for date calculations and cruise duration forecasting

### Key Files

- `src/app/page.tsx` - Main calendar component with FullCalendar integration
- `src/app/api/orders/route.ts` - WooCommerce API endpoint with parallel pagination
- `src/app/layout.tsx` - Root layout component
- `src/app/globals.css` - Global styles with TailwindCSS

### Data Flow

1. API route fetches completed WooCommerce orders from 2025-01-01 onwards
2. Orders contain `_prdd_lite_date` meta field for delivery dates
3. Cruise durations are extracted from product names (e.g., "5-Night")
4. Parking occupancy is calculated by spreading bookings across cruise duration + 1 days
5. Calendar displays color-coded occupancy levels:
   - Green: 0-57 cars (low)
   - Yellow: 58-92 cars (medium)
   - Red: 93-115 cars (high)

## Development Commands

### Core Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Environment Setup

Requires `.env.local` with WooCommerce API credentials:

```
WC_CONSUMER_KEY=your_ck_key
WC_CONSUMER_SECRET=your_cs_key
```

## Technology Stack

- **Framework**: Next.js 15.4.4 with App Router
- **Runtime**: React 19.1.0
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4
- **Calendar**: FullCalendar 6.1.18
- **Date Processing**: Moment.js 2.30.1
- **Linting**: ESLint 9 with Next.js config

## Key Features

- Parallel pagination for efficient WooCommerce data fetching
- Real-time occupancy calculation with color-coded calendar events
- Modal UI for viewing customer details when clicking calendar dates
- Error handling for API failures
- TypeScript interfaces for WooCommerce order structure

## File Structure Patterns

- API routes in `src/app/api/` using Next.js 15 route handlers
- Components follow TypeScript interfaces for WooCommerce data structures
- Inline styles used for modal components (no separate CSS modules)
- Path alias `@/*` configured for `./src/*` imports
