from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, Query
import logging
from app.schemas.data import TimeseriesResponse
from app.services.visualization_service import VisualizationService
from app.repositories.data_repository import DataRepository
from app.api.deps import get_current_user, get_data_repository
from app.schemas.auth import User
from app.core.exceptions import DataNotFoundError, DataProcessingError
from app.services.raster_service import RasterService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


router = APIRouter()


@router.get("/csv/timeseries/{filename}", response_model=TimeseriesResponse)
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
    data_repo: DataRepository = Depends(get_data_repository),
    current_user: User = Depends(get_current_user),
    filename: str = "",
) -> TimeseriesResponse:
    """Get timeseries data for visualization"""
    viz_service = VisualizationService(
        data_repo=data_repo,
        filename=filename,
        username=current_user.username,
    )

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


@router.get("/csv/available-filters/{filename}")
async def get_available_filters(
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
    filename: str = None,
) -> Dict[str, List[str]]:
    """Get available filter options for visualization"""
    viz_service = VisualizationService(data_repo, filename)
    return viz_service.get_available_filters()


@router.get("/raster/tile/{filename}/{variable}/{time_index}/{zoom}/{x}/{y}")
async def get_raster_tile(
    variable: str,
    time_index: int,
    zoom: int,
    x: int,
    y: int,
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
    filename: str = "",
) -> Dict[str, Any]:
    """Get a specific tile of raster data for efficient visualization"""

    try:
        file_path = data_repo._get_file_path(
            username=current_user.username, filename=filename
        )
        tile_data = RasterService.extract_tile_from_netcdf(
            file_path, variable, time_index, zoom, x, y
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


@router.get("/raster/metadata/{filename}")
async def get_raster_metadata(
    data_repo: DataRepository = Depends(get_data_repository),
    current_user: User = Depends(get_current_user),
    filename: str = "",
) -> Dict[str, Any]:
    """Get raster dataset metadata"""
    try:
        file_path = data_repo._get_file_path(
            filename=filename, username=current_user.username
        )
        print({"file_path": file_path})

        return RasterService.get_raster_metadata(file_path)
    except Exception as e:
        logger.error(f"Error getting raster metadata: {e}")
        raise DataProcessingError(f"Error processing raster metadata: {str(e)}")
