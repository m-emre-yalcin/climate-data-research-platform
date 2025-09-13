import pytest
import pandas as pd
from pathlib import Path
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

from app.services.raster_service import RasterService
from app.main import app


class TestRasterService:
    def test_process_raster_data(self):
        """Test raster processing with real NetCDF data"""
        netcdf_path = "./tests/data/sample_raster.nc"

        info = RasterService.process_raster_data(netcdf_path)

        assert "dimensions" in info
        assert "variables" in info
        assert "coordinates" in info
        assert len(info["variables"]) > 0
