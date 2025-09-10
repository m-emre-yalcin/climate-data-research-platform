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
        column: Optional[str] = None,
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

        if column and column in numeric_cols:
            value_col = column
        elif "value" in numeric_cols:
            value_col = "value"
        else:
            value_col = numeric_cols[0]

        # Prepare visualization data
        if len(df_filtered) > 0:
            viz_data = df_filtered.groupby(date_col)[value_col].sum().reset_index()
            viz_data = viz_data.sort_values(date_col)

            # Format dates for display
            if date_col == "year":
                x_axis = viz_data[date_col].astype(str).tolist()
            else:
                x_axis = (
                    pd.to_datetime(viz_data[date_col]).dt.strftime("%Y-%m-%d").tolist()
                )

            y_axis = viz_data[value_col].tolist()
        else:
            x_axis = []
            y_axis = []

        # Get filter options
        filter_options = self.get_available_filters()

        return TimeseriesResponse(
            x_axis=x_axis,
            y_axis=y_axis,
            x_label=date_col,
            y_label=value_col,
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
