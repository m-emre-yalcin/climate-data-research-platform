from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
import logging
from io import StringIO, BytesIO
from app.schemas.data import DataSummary
from app.repositories.data_repository import DataRepository
from app.services.csv_service import CSVService
from app.services.raster_service import RasterService
from app.api.deps import get_current_user, get_data_repository
from app.schemas.auth import User
from app.core.exceptions import DataNotFoundError, DataProcessingError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/raster/tile/{variable}/{time_index}/{zoom}/{x}/{y}")
async def get_raster_tile(
    variable: str,
    time_index: int,
    zoom: int,
    x: int,
    y: int,
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> Dict[str, Any]:
    """Get a specific tile of raster data for efficient visualization"""

    # Get the stored file content from your repository
    file_content = data_repo.get_netcdf_file_content()  # You'll need this method
    if file_content is None:
        raise DataNotFoundError("No NetCDF file available")

    try:
        # Use your existing RasterService but modify for tile extraction
        tile_data = RasterService.extract_tile_from_netcdf(
            file_content, variable, time_index, zoom, x, y
        )

        return {
            "tile": tile_data["data"].tolist(),
            "metadata": {
                "variable": variable,
                "time_index": time_index,
                "zoom": zoom,
                "x": x,
                "y": y,
                "tile_size": 256,
                "stats": tile_data["stats"],
            },
        }

    except Exception as e:
        logger.error(f"Error extracting tile: {e}")

        return {
            "metadata": {
                "variable": variable,
                "time_index": time_index,
                "zoom": zoom,
                "x": x,
                "y": y,
                "tile_size": 256,
                "fallback": True,
            },
        }


# Add metadata endpoint
@router.get("/raster/metadata")
async def get_raster_metadata(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> Dict[str, Any]:
    """Get raster dataset metadata"""

    file_content = data_repo.get_netcdf_file_content()
    if file_content is None:
        raise DataNotFoundError("No NetCDF file available")

    try:
        return RasterService.get_raster_metadata(file_content)
    except Exception as e:
        logger.error(f"Error getting raster metadata: {e}")
        raise DataProcessingError(f"Error processing raster metadata: {str(e)}")


@router.get("/csv")
async def get_csv_data(
    page: int = Query(0, ge=0, description="Page number (0-based)"),
    page_size: int = Query(1000, ge=10, le=10000, description="Items per page"),
    columns: Optional[str] = Query(None, description="Comma-separated column names"),
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> Dict[str, Any]:
    """Get paginated CSV data"""
    df = data_repo.get_csv_data()
    if df is None:
        raise DataNotFoundError("No CSV data available")

    # Filter columns if specified
    if columns:
        column_list = [col.strip() for col in columns.split(",")]
        available_columns = [col for col in column_list if col in df.columns]
        if available_columns:
            df = df[available_columns]

    # Calculate pagination
    start_idx = page * page_size
    end_idx = start_idx + page_size
    total_rows = len(df)

    # Get paginated data
    paginated_df = df.iloc[start_idx:end_idx]

    cleaning_report = data_repo.get_cleaning_report()

    return {
        "data": paginated_df.to_dict("records"),
        "columns": df.columns.tolist(),
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_rows": total_rows,
            "total_pages": (total_rows + page_size - 1) // page_size,
            "has_next": end_idx < total_rows,
            "has_previous": page > 0,
        },
        "cleaning_report": cleaning_report,
    }


@router.get("/summary", response_model=DataSummary)
async def get_data_summary(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> DataSummary:
    """Get comprehensive summary of all loaded data"""
    summary = DataSummary()

    # CSV data summary (metadata only)
    csv_data = data_repo.get_csv_data()
    if csv_data is not None:
        summary.csv = CSVService.get_data_summary(csv_data)

    # Raster data summary (metadata only)
    raster_data = data_repo.get_raster_data()
    if raster_data is not None:
        # Only include metadata, not full data arrays
        raster_summary = {
            "dimensions": raster_data.get("dimensions", {}),
            "variables": raster_data.get("variables", []),
            "attributes": raster_data.get("attributes", {}),
        }
        summary.raster = raster_summary

    # Cleaning report
    cleaning_report = data_repo.get_cleaning_report()
    if cleaning_report is not None:
        summary.cleaning_report = cleaning_report

    return summary


@router.delete("/clear/{data_key}")
async def clear_all_data(
    data_key: str,
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> Dict[str, str]:
    """Clear all stored data"""
    data_repo.clear_data_by_key(data_key)
    return {"message": f"Data {data_key} cleared successfully"}
