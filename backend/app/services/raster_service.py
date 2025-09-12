import pandas as pd
import numpy as np
import xarray as xr
from typing import Tuple, Dict, Any
import logging
import os
from app.core.exceptions import DataProcessingError

logger = logging.getLogger(__name__)


class RasterService:
    @staticmethod
    def process_raster_data(file_path: str) -> dict:
        """
        Clean and standardize the NetCDF raster data
        """
        try:
            # Read NetCDF data from uploaded file
            ds = xr.open_dataset(file_path, engine="h5netcdf")

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

    @staticmethod
    def extract_tile_from_netcdf(
        file_path: str,
        variable: str,
        time_index: int,
        zoom: int,
        x: int,
        y: int,
        tile_size: int = 256,
    ) -> dict:
        """Extract a specific tile from NetCDF data"""
        try:
            # Open dataset
            ds = xr.open_dataset(file_path, engine="h5netcdf")

            if variable not in ds.data_vars:
                raise ValueError(f"Variable {variable} not found")

            var_data = ds[variable]

            # Select time slice
            if "time" in var_data.dims:
                if time_index >= len(var_data.time):
                    raise ValueError(f"Time index {time_index} out of range")
                var_data = var_data.isel(time=time_index)

            # Calculate tile bounds
            tiles_per_row = 2**zoom
            full_data = var_data.values

            # Handle your data dimensions (assuming lat, lon)
            if len(full_data.shape) == 2:
                lat_size, lon_size = full_data.shape
            else:
                raise ValueError(f"Unexpected data shape: {full_data.shape}")

            # Calculate tile indices
            lat_per_tile = max(1, lat_size // tiles_per_row)
            lon_per_tile = max(1, lon_size // tiles_per_row)

            lat_start = min(y * lat_per_tile, lat_size - 1)
            lat_end = min((y + 1) * lat_per_tile, lat_size)
            lon_start = min(x * lon_per_tile, lon_size - 1)
            lon_end = min((x + 1) * lon_per_tile, lon_size)

            # Extract tile subset
            tile_data = full_data[lat_start:lat_end, lon_start:lon_end]

            # Resample to standard tile size if needed
            if tile_data.shape != (tile_size, tile_size):
                from scipy.ndimage import zoom as scipy_zoom

                zoom_factors = (
                    tile_size / tile_data.shape[0],
                    tile_size / tile_data.shape[1],
                )
                tile_data = scipy_zoom(tile_data, zoom_factors, order=1)

            # Ensure exact tile size and handle NaN
            tile_data = tile_data[:tile_size, :tile_size]
            tile_data = np.nan_to_num(tile_data, nan=0.0)

            ds.close()

            return {
                "data": tile_data,
                "stats": {
                    "min": float(np.nanmin(tile_data)),
                    "max": float(np.nanmax(tile_data)),
                    "mean": float(np.nanmean(tile_data)),
                },
            }

        except Exception as e:
            logger.error(f"Error extracting tile: {e}")
            raise

    @staticmethod
    def get_raster_metadata(file_path: str) -> dict:
        """Get metadata for the tile viewer (enhanced version of process_raster_data)"""
        try:

            ds = xr.open_dataset(file_path, engine="h5netcdf")
            ds = ds.load()

            # Get coordinate info
            lat_name = "lat" if "lat" in ds.coords else "latitude"
            lon_name = "lon" if "lon" in ds.coords else "longitude"

            # Calculate bounds
            if lat_name in ds.coords and lon_name in ds.coords:
                lats = ds[lat_name].values
                lons = ds[lon_name].values
                bounds = {
                    "north": float(np.max(lats)),
                    "south": float(np.min(lats)),
                    "east": float(np.max(lons)),
                    "west": float(np.min(lons)),
                }
                resolution = {
                    "lat": float(abs(lats[1] - lats[0]) if len(lats) > 1 else 1.0),
                    "lon": float(abs(lons[1] - lons[0]) if len(lons) > 1 else 1.0),
                }
            else:
                bounds = {"north": 90, "south": -90, "east": 180, "west": -180}
                resolution = {"lat": 1.0, "lon": 1.0}

            # Calculate statistics for each variable
            statistics = {}
            for var in ds.data_vars:
                data = ds[var].values
                statistics[var] = {
                    "min": float(np.nanmin(data)),
                    "max": float(np.nanmax(data)),
                    "mean": float(np.nanmean(data)),
                    "units": str(ds[var].attrs.get("units", "unknown")),
                }

            metadata = {
                "dimensions": dict(ds.dims),
                "variables": list(ds.data_vars),
                "bounds": bounds,
                "resolution": resolution,
                "attributes": {
                    "title": str(ds.attrs.get("title", "NetCDF Dataset")),
                    "institution": str(ds.attrs.get("institution", "")),
                    "comment": str(ds.attrs.get("comment", "")),
                },
                "statistics": statistics,
            }

            ds.close()
            return metadata

        except Exception as e:
            logger.error(f"Error getting metadata: {e}")
            raise
