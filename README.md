# Climate Data Platform

Web app for uploading, cleaning, and visualising climate datasets with support for raster data.

---

## Table of Contents

- [Climate Data Platform](#climate-data-platform)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
    - [Screenshots](#screenshots)
      - [API documentation](#api-documentation)
      - [Webapp](#webapp)
  - [Architecture](#architecture)
  - [Data Handling](#data-handling)
  - [Setup \& Installation](#setup--installation)
  - [Usage](#usage)
  - [Authentication](#authentication)
  - [Design Choices \& Trade-offs](#design-choices--trade-offs)
  - [Assumptions](#assumptions)
  - [Future Improvements](#future-improvements)
  - [License](#license)

---

## Overview

This full stack project consists of a [backend](https://github.com/m-emre-yalcin/climate-data-research-platform/tree/main/backend) and a [frontend](https://github.com/m-emre-yalcin/climate-data-research-platform/tree/main/frontend). The main goal is to digest uploaded CSV/NetCDF climate datasets and visualize them on an interactive dashboard.

> Check out supported [data formats here](https://github.com/m-emre-yalcin/climate-data-research-platform/tree/main/backend/tests/data).

**The workflow:** users upload files, backend processes and stores them on the file system, then serves clean and aggregated data on request. CSV files are visualized with highly customizable time series charts with backend filter support. NetCDF files are rendered with dynamic tile loading to prevent overloading GBs of data and freezing the frontend.

> Tile loading could use better algorithms or streaming for efficiency. Due to time constraints, I couldn't optimize further.

---

## Features

- Upload & process CSV time-series climate data with automatic cleaning
- NetCDF raster data visualization with tile-based rendering
- Interactive time series charts with filtering capabilities
- Spatial data analysis with geographic bounds detection
- JWT-based authentication system
- Containerized deployment with Docker
- Comprehensive API documentation
- Data quality reporting and statistics

### Screenshots

#### API documentation

![API Documentation](https://github.com/m-emre-yalcin/climate-data-research-platform/blob/main/screenshots/api_docs.png?raw=true)

#### Webapp

![Login](https://github.com/m-emre-yalcin/climate-data-research-platform/blob/main/screenshots/login_page.png?raw=true)
![Data Sources](https://github.com/m-emre-yalcin/climate-data-research-platform/blob/main/screenshots/data_sources.png?raw=true)
![File Upload Section](https://github.com/m-emre-yalcin/climate-data-research-platform/blob/main/screenshots/file_upload_section.png?raw=true)
![Raster View Analysis](https://github.com/m-emre-yalcin/climate-data-research-platform/blob/main/screenshots/raster_view_analysis.png?raw=true)
![Raster View Data](https://github.com/m-emre-yalcin/climate-data-research-platform/blob/main/screenshots/raster_view_spatial_data.png?raw=true)
![Time Series Analysis](https://github.com/m-emre-yalcin/climate-data-research-platform/blob/main/screenshots/time_series_analysis.png?raw=true)

---

## Architecture

I implemented DDD (Domain-Driven Design) architecture on the backend, organizing modules logically and keeping code DRY. Added 5 test cases covering real scenarios - check coverage at `/backend/htmlcov/index.html`.

For the frontend, I used one of my boilerplates to kickstart development. Components are grouped logically with isolated responsibilities to avoid chaos. Unlike many frontend projects, this uses `pnpm` for efficient module installations.

- **Frontend**: Next.js, TypeScript, Tailwind CSS, Radix UI, Leaflet (for grids), Lucide React (icons), Recharts (time series), OpenStreetMap (raster visualization)
- **Backend**: FastAPI, Pydantic, SciPy, NumPy, Pandas, PyJWT, xarray for core functionality. [API docs available here](https://github.com/m-emre-yalcin/climate-data-research-platform/tree/main/screenshots/api_docs.png)
- **Storage/Processing**: Files stored in `/backend/app/uploads` (demo purpose)
- **Deployment**: Docker Compose

Clean separation of concerns: frontend handles visualization, backend handles data processing & API requests.

---

## Data Handling

- **CSV**: Standardizes column names, detects & converts dates, fills missing values (median/mode), removes duplicates, converts units.

- **NetCDF raster**: Extracts metadata, tiles datasets for web display, handles NaNs, supports time-slices for temporal analysis.

- **Standardization**: Coordinates, time indices, tile sizes, and metadata are consistent for API responses.

---

## Setup & Installation

```bash
# Clone repo
git clone https://github.com/m-emre-yalcin/climate-data-research-platform
cd climate-data-research-platform

# Start the app with Docker Compose
docker compose up
```

And that's it! You're ready to preview.

By default, it will run:

- API: http://localhost:8000
- WEB: http://localhost:3000

---

## Usage

- Visit [Climate Data Research Platform](http://localhost:3000) after docker container is running
- Login with these credentials:
  - username: `researcher`
  - password: `iiasa_climate123`
- Upload CSV and/or NetCDF datasets
- Clean & visualize data
- Explore spatial and time series analysis

---

## Authentication

- Uses JWT (JSON Web Token) for secure authentication
- Implements HS256 algorithm as default
- 10-minute access token expiry (returns 401 when expired, auto-logout)
- No refresh token logic implemented (kept simple for demo)
- All API resources require valid JWT token

---

## Design Choices & Trade-offs

**Framework Choices:**

- FastAPI for backend: Fast development, automatic OpenAPI docs, type hints
- Next.js for frontend: TypeScript support, good ecosystem
- xarray for NetCDF: Industry standard for scientific data manipulation

**Trade-offs:**

- Simplicity vs Scalability: File system storage is easy but not production-ready
- Performance vs Features: Tile-based raster rendering improves UX but adds complexity
- Security: JWT sufficient for demo. Production would need more robust access control

---

## Assumptions

- Dataset sizes < 100MB (for demo)
- Users upload properly formatted climate data
- Authentication requirements are minimal

---

## Future Improvements

- Move storage to a database with indexing
- Add caching (Redis)
- Background processing queues for large uploads
- Implement progressive loading
- Implement CDN for static tile serving
- Add data compression for network efficiency
- Extend authentication with multi-user roles

---

## License

You can use this repo freely.

[MIT](https://github.com/m-emre-yalcin/climate-data-research-platform/blob/main/LICENSE)
