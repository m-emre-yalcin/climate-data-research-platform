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
        model: Optional[str] = None,
        scenario: Optional[str] = None,
        region: Optional[str] = None,
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

        # Find date and numeric columns
        date_cols = []
        if "year" in df_filtered.columns:
            date_cols = ["year"]
        else:
            date_cols = df_filtered.select_dtypes(
                include=["datetime64"]
            ).columns.tolist()

        numeric_cols = df_filtered.select_dtypes(include=[np.number]).columns.tolist()

        if len(date_cols) == 0:
            raise DataProcessingError("No date/year column found in data")
        if len(numeric_cols) == 0:
            raise DataProcessingError("No numeric columns found in data")

        # Select columns for visualization
        date_col = date_cols[0]

        if columns:
            value_cols = [col for col in columns if col in numeric_cols]
            if not value_cols:
                raise DataProcessingError("No valid columns selected")
        else:
            if "value" in numeric_cols:
                value_cols = ["value"]
            else:
                value_cols = [numeric_cols[0]]

        # Prepare visualization data
        if len(df_filtered) > 0:
            agg_df = df_filtered.groupby(date_col)[value_cols].sum().reset_index()
            agg_df = agg_df.sort_values(date_col)

            # Format dates for display (convert year to YYYY-01-01 for parsable dates)
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

        return filter_options
