import pandas as pd
import numpy as np
import xarray as xr
from typing import Tuple, Dict, Any
import logging
import tempfile
import os
from app.core.exceptions import DataProcessingError

logger = logging.getLogger(__name__)


class RasterService:
    @staticmethod
    def process_raster_data(file_content: bytes) -> dict:
        """
        Clean and standardize the NetCDF raster data
        """
        temp_file = None
        try:
            # Write to a temporary file
            with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name

            # Read NetCDF data from the temporary file
            ds = xr.open_dataset(temp_file_path, engine="h5netcdf")

            # Load the data into memory
            ds = ds.load()

            # Get basic info about the dataset
            info = {
                "dimensions": dict(ds.dims),
                "variables": list(ds.data_vars),
                "coordinates": list(ds.coords),
                "attributes": dict(ds.attrs),
                "shape": {var: ds[var].shape for var in ds.data_vars},
            }

            # Extract sample data for visualization (first variable, first two time slices)
            if ds.data_vars:
                first_var = list(ds.data_vars)[0]
                var_data = ds[first_var]

                # Get two monthly layers if time dimension exists
                if "time" in var_data.dims and len(var_data.time) >= 2:
                    layer1 = var_data.isel(time=0).values
                    layer2 = var_data.isel(time=1).values

                    info["sample_layers"] = {
                        "layer1": {
                            "data": (
                                layer1.tolist()
                                if layer1.size < 10000
                                else "Too large for JSON"
                            ),
                            "shape": layer1.shape,
                            "min": float(np.nanmin(layer1)),
                            "max": float(np.nanmax(layer1)),
                            "mean": float(np.nanmean(layer1)),
                        },
                        "layer2": {
                            "data": (
                                layer2.tolist()
                                if layer2.size < 10000
                                else "Too large for JSON"
                            ),
                            "shape": layer2.shape,
                            "min": float(np.nanmin(layer2)),
                            "max": float(np.nanmax(layer2)),
                            "mean": float(np.nanmean(layer2)),
                        },
                    }

            # Close the dataset
            ds.close()

            return info

        except Exception as e:
            logger.error(f"Error processing raster data: {e}")
            raise DataProcessingError(f"Error cleaning CSV data: {str(e)}")
        finally:
            # Clean up temporary file
            if temp_file and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
