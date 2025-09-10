from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd


class FileUploadResponse(BaseModel):
    message: str
    filename: str


class CSVUploadResponse(FileUploadResponse):
    cleaning_report: Dict[str, Any]
    preview: List[Dict[str, Any]]
    summary: Dict[str, Any]


class RasterUploadResponse(FileUploadResponse):
    info: Dict[str, Any]


class DataSummary(BaseModel):
    csv: Optional[Dict[str, Any]] = None
    raster: Optional[Dict[str, Any]] = None
    cleaning_report: Optional[Dict[str, Any]] = None


class TimeseriesRequest(BaseModel):
    column: Optional[str] = None
    model: Optional[str] = None
    scenario: Optional[str] = None
    region: Optional[str] = None


class TimeseriesResponse(BaseModel):
    x_axis: List[str]
    y_axis: List[float]
    x_label: str
    y_label: str
    available_columns: List[str]
    filter_options: Dict[str, List[str]]
    data_count: int
    total_data_points: int
    filtered: bool
