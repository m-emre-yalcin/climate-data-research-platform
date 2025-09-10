from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from app.schemas.data import CSVUploadResponse, RasterUploadResponse
from app.services.csv_service import CSVService
from app.services.raster_service import RasterService
from app.repositories.data_repository import DataRepository
from app.api.deps import get_current_user, get_data_repository
from app.schemas.auth import User
import pandas as pd
import io

router = APIRouter()


@router.post("/csv", response_model=CSVUploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
):
    """Upload and process CSV file"""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        # Read the CSV file
        content = await file.read()
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))

        # Clean the data using service
        cleaned_df, cleaning_report = CSVService.clean_csv_data(df)

        # Generate summary
        summary = CSVService.get_data_summary(cleaned_df)

        # Store in repository
        data_repo.store_csv_data(cleaned_df, cleaning_report)

        return CSVUploadResponse(
            message="CSV uploaded and processed successfully",
            filename=file.filename,
            cleaning_report=cleaning_report,
            preview=cleaned_df.head().to_dict("records"),
            summary=summary,
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")


@router.post("/raster", response_model=RasterUploadResponse)
async def upload_raster(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
):
    """Upload and process raster (NetCDF) file"""
    if not file.filename.endswith(".nc"):
        raise HTTPException(status_code=400, detail="File must be a NetCDF file")

    try:
        content = await file.read()
        raster_info = RasterService.process_raster_data(content)

        # Store processed info
        data_repo.store_raster_data(raster_info)

        return RasterUploadResponse(
            message="Raster data uploaded and processed successfully",
            filename=file.filename,
            info=raster_info,
        )

    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error processing raster: {str(e)}"
        )
