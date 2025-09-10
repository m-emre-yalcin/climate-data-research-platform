from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from app.schemas.data import TimeseriesResponse
from app.services.visualization_service import VisualizationService
from app.repositories.data_repository import DataRepository
from app.api.deps import get_current_user, get_data_repository
from app.schemas.auth import User

router = APIRouter()


@router.get("/timeseries", response_model=TimeseriesResponse)
async def get_timeseries_data(
    columns: List[str] = Query(
        None, description="Columns to visualize (multiple allowed)"
    ),
    model: Optional[str] = Query(None, description="Filter by model"),
    unit: Optional[str] = Query(None, description="Filter by unit"),
    scenario: Optional[str] = Query(None, description="Filter by scenario"),
    region: Optional[str] = Query(None, description="Filter by region"),
    species_group: Optional[str] = Query(None, description="Filter by species_group"),
    forest_land: Optional[str] = Query(None, description="Filter by forest_land"),
    item: Optional[str] = Query(None, description="Filter by item"),
    variable: Optional[str] = Query(None, description="Filter by variable"),
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> TimeseriesResponse:
    """Get timeseries data for visualization"""
    viz_service = VisualizationService(data_repo)

    return viz_service.get_timeseries_data(
        columns=columns,
        model=model,
        scenario=scenario,
        region=region,
        unit=unit,
        species_group=species_group,
        forest_land=forest_land,
        item=item,
        variable=variable,
    )


@router.get("/available-filters")
async def get_available_filters(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
) -> Dict[str, List[str]]:
    """Get available filter options for visualization"""
    viz_service = VisualizationService(data_repo)
    return viz_service.get_available_filters()
