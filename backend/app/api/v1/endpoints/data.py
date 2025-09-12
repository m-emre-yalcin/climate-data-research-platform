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


@router.get("/list", response_model=List[Dict[str, Any]])
async def list_filenames(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
):
    """List all filenames for the current user"""
    return data_repo.get_user_files(current_user.username)


@router.delete("/clear/{filename}", response_model=Dict[str, str])
async def clear_all_data(
    filename: str,
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
):
    """Clear all stored data"""
    data_repo.clear_data_by_filename(filename=filename)
    return {"message": f"Data {filename} cleared successfully"}


# Extra
# TODO: Implement on frontend later
@router.get("/summary/{filename}", response_model=DataSummary)
async def get_data_summary(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
    filename=str,
):
    """Get comprehensive summary of all loaded data"""
    summary = DataSummary()

    # CSV data summary (metadata only)
    csv_data = data_repo.get_csv_data(filename=filename)
    if csv_data is not None:
        summary.csv = CSVService.get_data_summary(csv_data)

    # Raster data summary (metadata only)
    raster_data = data_repo.get_raster_data(
        username=current_user.username, filename=filename
    )
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
