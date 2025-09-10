# API Architecture

```txt
climate_data_platform_backend/
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI app initialization
│   ├── config.py             # Configuration settings
│   │
│   ├── api/                  # API layer
│   │   ├── __init__.py
│   │   ├── deps.py             # Dependency injection
│   │   └── v1/                 # API version 1
│   │       ├── __init__.py
│   │       ├── router.py         # Main router
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── auth.py         # Authentication endpoints
│   │           ├── upload.py       # File upload endpoints
│   │           ├── data.py         # Data retrieval endpoints
│   │           └── visualization.py # Visualization endpoints
│   │
│   ├── core/                 # Core business logic
│   │   ├── __init__.py
│   │   ├── config.py         # Core configuration
│   │   ├── security.py       # Security utilities
│   │   └── exceptions.py     # Custom exceptions
│   │
│   ├── services/             # Business logic services
│   │   ├── __init__.py
│   │   ├── auth_service.py   # Authentication logic
│   │   ├── data_processor.py # Data processing logic
│   │   ├── csv_service.py    # CSV-specific operations
│   │   ├── raster_service.py # Raster data operations
│   │   └── visualization_service.py # Visualization logic
│   │
│   ├── schemas/              # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── auth.py           # Auth schemas
│   │   ├── data.py           # Data schemas
│   │   └── visualization.py  # Visualization schemas
│   │
│   ├── repositories/         # Data access layer
│   │   ├── __init__.py
│   │   ├── base.py           # Base repository
│   │   ├── user_repository.py # User data access
│   │   └── data_repository.py # Research data access
│   │
│   └── utils/                # Utility functions
│       ├── __init__.py
│       ├── file_handlers.py    # File processing utilities
│       ├── data_validation.py  # Data validation utilities
│       └── formatters.py     # Data formatting utilities
│
├── tests/                  # Test files
│   ├── __init__.py
│   ├── conftest.py           # Pytest configuration
│   ├── test_auth.py
│   ├── test_data_processing.py
│   └── test_visualization.py
│
├── requirements.txt        # Dependencies
├── .env.example            # Environment variables example
├── .gitignore
├── README.md
└── docker-compose.yml      # For local development
```
