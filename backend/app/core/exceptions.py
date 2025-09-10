from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class BaseAPIException(HTTPException):
    """Base exception class for all API exceptions"""

    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code or self.__class__.__name__


class AuthenticationError(BaseAPIException):
    """Raised when authentication fails"""

    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
            error_code="AUTH_FAILED",
        )


class AuthorizationError(BaseAPIException):
    """Raised when user doesn't have permission to access resource"""

    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="ACCESS_DENIED",
        )


class DataNotFoundError(BaseAPIException):
    """Raised when requested data is not found"""

    def __init__(self, detail: str = "Data not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="DATA_NOT_FOUND",
        )


class DataProcessingError(BaseAPIException):
    """Raised when data processing fails"""

    def __init__(self, detail: str = "Error processing data"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="DATA_PROCESSING_ERROR",
        )


class FileUploadError(BaseAPIException):
    """Raised when file upload fails"""

    def __init__(self, detail: str = "Error uploading file"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="FILE_UPLOAD_ERROR",
        )


class InvalidFileFormatError(BaseAPIException):
    """Raised when uploaded file format is invalid"""

    def __init__(self, detail: str = "Invalid file format"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="INVALID_FILE_FORMAT",
        )


class FileSizeExceededError(BaseAPIException):
    """Raised when uploaded file size exceeds limit"""

    def __init__(self, detail: str = "File size exceeds maximum limit"):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=detail,
            error_code="FILE_TOO_LARGE",
        )


class DataValidationError(BaseAPIException):
    """Raised when data validation fails"""

    def __init__(self, detail: str = "Data validation failed"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="VALIDATION_ERROR",
        )


class ConfigurationError(BaseAPIException):
    """Raised when there's a configuration error"""

    def __init__(self, detail: str = "Configuration error"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="CONFIG_ERROR",
        )


class ExternalServiceError(BaseAPIException):
    """Raised when external service call fails"""

    def __init__(self, detail: str = "External service unavailable"):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            error_code="EXTERNAL_SERVICE_ERROR",
        )


class DatabaseError(BaseAPIException):
    """Raised when database operation fails"""

    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="DATABASE_ERROR",
        )


class RateLimitExceededError(BaseAPIException):
    """Raised when rate limit is exceeded"""

    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_code="RATE_LIMIT_EXCEEDED",
        )


class VisualizationError(BaseAPIException):
    """Raised when data visualization fails"""

    def __init__(self, detail: str = "Error generating visualization"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="VISUALIZATION_ERROR",
        )


class CSVProcessingError(DataProcessingError):
    """Specific exception for CSV processing errors"""

    def __init__(self, detail: str = "Error processing CSV file"):
        super().__init__(detail)
        self.error_code = "CSV_PROCESSING_ERROR"


class RasterProcessingError(DataProcessingError):
    """Specific exception for raster data processing errors"""

    def __init__(self, detail: str = "Error processing raster data"):
        super().__init__(detail)
        self.error_code = "RASTER_PROCESSING_ERROR"


class NetCDFError(RasterProcessingError):
    """Specific exception for NetCDF file processing errors"""

    def __init__(self, detail: str = "Error processing NetCDF file"):
        super().__init__(detail)
        self.error_code = "NETCDF_ERROR"


class ClimateDataError(DataProcessingError):
    """Specific exception for climate data processing errors"""

    def __init__(self, detail: str = "Error processing climate data"):
        super().__init__(detail)
        self.error_code = "CLIMATE_DATA_ERROR"
