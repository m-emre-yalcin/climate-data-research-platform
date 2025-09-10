import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from app.repositories.data_repository import DataRepository
from app.schemas.data import TimeseriesResponse
from app.core.exceptions import DataNotFoundError, DataProcessingError


class VisualizationService:
    def __init__(self, data_repo: DataRepository):
        self.data_repo = data_repo

    def get_timeseries_data(
        self,
        columns: Optional[List[str]] = None,
        unit: Optional[str] = None,
        model: Optional[str] = None,
        scenario: Optional[str] = None,
        region: Optional[str] = None,
        species_group: Optional[str] = None,
        forest_land: Optional[str] = None,
        item: Optional[str] = None,
        variable: Optional[str] = None,
    ) -> TimeseriesResponse:
        """Generate timeseries data for visualization"""
        df = self.data_repo.get_csv_data()
        if df is None:
            raise DataNotFoundError("No CSV data available")

        df_filtered = df.copy()

        # Apply filters if provided
        if model and "Model" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["Model"] == model]
        if scenario and "scenario" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["scenario"] == scenario]
        if region and "region" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["region"] == region]
        if unit and "unit" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["unit"] == unit]
        if species_group and "species_group" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["species_group"] == species_group]
        if forest_land and "forest_land" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["forest_land"] == forest_land]
        if item and "item" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["item"] == item]
        if variable and "variable" in df_filtered.columns:
            df_filtered = df_filtered[df_filtered["variable"] == variable]

        # Determine date and numeric columns
        if "year" in df_filtered.columns:
            date_col = "year"
        else:
            date_cols = df_filtered.select_dtypes(
                include=["datetime64"]
            ).columns.tolist()
            if not date_cols:
                raise DataProcessingError("No date/year column found in data")
            date_col = date_cols[0]

        numeric_cols = df_filtered.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols:
            raise DataProcessingError("No numeric columns found in data")

        # Select columns for visualization
        numeric_cols = [col for col in numeric_cols if col != date_col]
        if columns:
            value_cols = [col for col in columns if col in numeric_cols]
            if not value_cols:
                raise DataProcessingError("No valid numeric columns selected")
        else:
            value_cols = ["value"] if "value" in numeric_cols else [numeric_cols[0]]

        # Prepare visualization data
        if not df_filtered.empty:
            # Aggregate "value" by sum, keep other columns as-is
            agg_dict = {col: "sum" if col == "value" else "first" for col in value_cols}
            agg_df = df_filtered.groupby(date_col, as_index=False).agg(agg_dict)
            agg_df = agg_df.sort_values(date_col)

            # Format date for visualization
            if date_col == "year":
                agg_df[date_col] = pd.to_datetime(
                    agg_df[date_col].astype(int).astype(str) + "-01-01"
                )
            else:
                agg_df[date_col] = pd.to_datetime(agg_df[date_col])

            x_axis = agg_df[date_col].dt.strftime("%Y-%m-%d").tolist()
            y_axes = {col: agg_df[col].tolist() for col in value_cols}
        else:
            x_axis = []
            y_axes = {col: [] for col in value_cols}

        # Get filter options
        filter_options = self.get_available_filters()

        return TimeseriesResponse(
            x_axis=x_axis,
            y_axes=y_axes,
            x_label=date_col,
            y_labels=value_cols,
            available_columns=numeric_cols,
            filter_options=filter_options,
            data_count=len(df_filtered),
            total_data_points=len(df),
            filtered=any([model, scenario, region]),
        )

    def get_available_filters(self) -> Dict[str, List[str]]:
        """Get available filter options from the data"""
        df = self.data_repo.get_csv_data()
        if df is None:
            return {}

        filter_options = {}
        if "Model" in df.columns:
            filter_options["models"] = sorted(df["Model"].unique().tolist())
        if "scenario" in df.columns:
            filter_options["scenarios"] = sorted(df["scenario"].unique().tolist())
        if "region" in df.columns:
            filter_options["regions"] = sorted(df["region"].unique().tolist())
        if "unit" in df.columns:
            filter_options["unit"] = sorted(df["unit"].unique().tolist())
        if "species_group" in df.columns:
            filter_options["species_group"] = sorted(
                df["species_group"].unique().tolist()
            )
        if "forest_land" in df.columns:
            filter_options["forest_land"] = sorted(df["forest_land"].unique().tolist())
        if "item" in df.columns:
            filter_options["item"] = sorted(df["item"].unique().tolist())
        if "variable" in df.columns:
            filter_options["variable"] = sorted(df["variable"].unique().tolist())

        return filter_options
