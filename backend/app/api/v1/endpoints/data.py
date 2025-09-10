from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from app.schemas.data import DataSummary
from app.repositories.data_repository import DataRepository
from app.services.csv_service import CSVService
from app.api.deps import get_current_user, get_data_repository
from app.schemas.auth import User
from app.core.exceptions import DataNotFoundError

router = APIRouter()


@router.get("/csv")
async def get_csv_data(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> Dict[str, Any]:
    """Get stored CSV data"""
    df = data_repo.get_csv_data()
    if df is None:
        raise DataNotFoundError("No CSV data available")

    cleaning_report = data_repo.get_cleaning_report()

    return {
        "data": df.to_dict("records"),
        "columns": df.columns.tolist(),
        "shape": df.shape,
        "cleaning_report": cleaning_report,
    }


@router.get("/raster")
async def get_raster_data(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> Dict[str, Any]:
    """Get stored raster data"""
    raster_data = data_repo.get_raster_data()
    if raster_data is None:
        raise DataNotFoundError("No raster data available")

    return raster_data


@router.get("/summary", response_model=DataSummary)
async def get_data_summary(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> DataSummary:
    """Get comprehensive summary of all loaded data"""
    summary = DataSummary()

    # CSV data summary
    csv_data = data_repo.get_csv_data()
    if csv_data is not None:
        summary.csv = CSVService.get_data_summary(csv_data)

    # Raster data summary
    raster_data = data_repo.get_raster_data()
    if raster_data is not None:
        summary.raster = raster_data

    # Cleaning report
    cleaning_report = data_repo.get_cleaning_report()
    if cleaning_report is not None:
        summary.cleaning_report = cleaning_report

    return summary


@router.delete("/clear")
async def clear_all_data(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> Dict[str, str]:
    """Clear all stored data"""
    data_repo.clear_all_data()
    return {"message": "All data cleared successfully"}
