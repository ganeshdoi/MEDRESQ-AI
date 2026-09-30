# MEDRESQ AI

MEDRESQ AI is a predictive healthcare resource management platform designed to support Primary Health Centres (PHCs) with better planning, forecasting, and operational resilience. The platform helps healthcare teams improve inventory management, anticipate seasonal demand changes, and monitor facility capacity using data-driven insights and AI-powered recommendations.

This project is a solution for “Smart Health: Smart Chain Resilience” and focuses on enabling more proactive health system management through intelligent planning and operational visibility.

## Overview

MEDRESQ AI aims to help public health administrators and frontline healthcare workers:

- Forecast resource demand and supply
- Monitor inventory usage and shortages
- Understand facility capacity trends
- Plan for seasonal spikes in patient demand
- Improve continuity of care and service preparedness
- Make faster and better-informed operational decisions

## Key Features

- Predictive healthcare resource planning
- Inventory forecasting and stock visibility
- Facility capacity tracking
- Seasonal preparedness analytics
- AI-assisted operational insights
- Interactive dashboard views
- Map-based and visual reporting
- Data export capabilities for reporting and decision making

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express
- AI: Google GenAI
- Database: PostgreSQL
- Data/ORM: Drizzle ORM
- Cloud: Firebase
- Visualization: Recharts, D3, Leaflet, Google Maps
- PDF / Image processing: jsPDF, html2canvas, Tesseract.js
- Styling: Tailwind CSS

## Project Structure

```bash
MEDRESQ-AI/
├── .github/                 # GitHub configuration and workflows
├── public/                  # Static public assets
├── src/                     # Frontend application code
│   ├── components/         # Reusable UI components
│   ├── context/            # Global app state/context
│   ├── data/               # Static or mock data
│   ├── db/                 # Database-related logic
│   ├── i18n/               # Internationalization files
│   ├── lib
