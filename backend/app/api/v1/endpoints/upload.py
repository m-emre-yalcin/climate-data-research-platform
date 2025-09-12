from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from app.schemas.data import CSVUploadResponse, RasterUploadResponse
from app.services.csv_service import CSVService
from app.services.raster_service import RasterService
from app.repositories.data_repository import DataRepository
from app.api.deps import get_current_user, get_data_repository
from app.schemas.auth import User
import pandas as pd
import io
import os
from pathlib import Path

router = APIRouter()

# Uploads directory must exist
UPLOADS_DIR = Path.cwd() / "app/uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


def get_file_path(username: str, filename: str) -> Path:
    """Generate file path with username_filename convention"""
    return UPLOADS_DIR / f"{username}_{filename}"


@router.post("/data", response_model=CSVUploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    data_repo: DataRepository = Depends(get_data_repository),
):
    """Upload and process CSV file"""
    if not (file.filename.endswith(".csv") or file.filename.endswith(".nc")):
        raise HTTPException(status_code=400, detail="File must be a CSV or NetCDF")

    # Check if file already exists
    file_path = get_file_path(current_user.username, file.filename)
    if file_path.exists():
        raise HTTPException(
            status_code=409,
            detail=f"File {file.filename} already exists for user {current_user.username}",
        )

    # Process csv
    if file.filename.endswith(".csv"):
        try:
            # Read the CSV file
            content = await file.read()
            df = pd.read_csv(io.StringIO(content.decode("utf-8")))

            # Clean the data using service
            cleaned_df, cleaning_report = CSVService.clean_csv_data(df)

            # Generate summary
            summary = CSVService.get_data_summary(cleaned_df)

            # Save file to uploads directory
            with open(file_path, "wb") as f:
                f.write(content)

            # Store metadata and processed data in repository
            metadata = {
                "filename": file.filename,
                "username": current_user.username,
                "file_path": str(file_path),
                "file_type": "csv",
            }
            data_repo.store_csv_data(cleaned_df, cleaning_report, metadata)

            return CSVUploadResponse(
                message="CSV uploaded and processed successfully",
                filename=file.filename,
                cleaning_report=cleaning_report,
                preview=cleaned_df.head().to_dict("records"),
                summary=summary,
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Error processing CSV: {str(e)}"
            )

    # Upload nc
    if file.filename.endswith(".nc"):
        try:
            # Read the nc file
            content = await file.read()
            raster_info = RasterService.process_raster_data(content)

            # Save file to uploads directory
            with open(file_path, "wb") as f:
                f.write(content)

            # Store processed info with metadata
            metadata = {
                "filename": file.filename,
                "username": current_user.username,
                "file_path": str(file_path),
                "file_type": "netcdf",
            }
            raster_info["metadata"] = metadata
            data_repo.store_raster_data(raster_info)

            return RasterUploadResponse(
                message="Raster data uploaded and processed successfully",
                filename=file.filename,
                info=raster_info,
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Error processing raster: {str(e)}"
            )
