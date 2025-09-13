# Climate Data Platform

- You should document how you cleaned and standardized the data.
- Focus on showing that your architecture can handle spatial + tabular data.
- Provide a README explaining design choices, assumptions, and trade-offs.

## Folder Structure

```txt
climate_data_platform_backend/
├── app/
│   ├── main.py               # FastAPI app initialization
│   ├── config.py             # Configuration settings
│   │
│   ├── api/                  # API layer
│   │   ├── deps.py             # Dependency injection
│   │   └── v1/                 # API version 1
│   │       ├── router.py         # Main router
│   │       └── endpoints/
│   │           ├── auth.py         # Authentication endpoints
│   │           ├── upload.py       # File upload endpoints
│   │           ├── data.py         # Data retrieval endpoints
│   │           └── visualization.py # Visualization endpoints
│   │
│   ├── core/                 # Core business logic
│   │   ├── config.py         # Core configuration
│   │   ├── security.py       # Security utilities
│   │   └── exceptions.py     # Custom exceptions
│   │
│   ├── services/             # Business logic services
│   │   ├── auth_service.py   # Authentication logic
│   │   ├── data_processor.py # Data processing logic
│   │   ├── csv_service.py    # CSV-specific operations
│   │   ├── raster_service.py # Raster data operations
│   │   └── visualization_service.py # Visualization logic
│   │
│   ├── schemas/              # Pydantic schemas
│   │   ├── auth.py           # Auth schemas
│   │   ├── data.py           # Data schemas
│   │   └── visualization.py  # Visualization schemas
│   │
│   ├── repositories/         # Data access layer
│   │   ├── base.py           # Base repository
│   │   ├── user_repository.py # User data access
│   │   └── data_repository.py # Research data access
│   │
│   └── utils/                # Utility functions
│       ├── file_handlers.py    # File processing utilities
│       ├── data_validation.py  # Data validation utilities
│       └── formatters.py     # Data formatting utilities
│
├── tests/                  # Test files
│   ├── conftest.py           # Pytest configuration
│   ├── test_*.py             # Test files
│
├── requirements.txt        # Dependencies
├── .env.example            # Environment variables example
├── .gitignore
├── README.md
└── docker-compose.yml      # For local development
```
