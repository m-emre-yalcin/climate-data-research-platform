import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import logging
from app.repositories.data_repository import DataRepository
from app.schemas.data import TimeseriesResponse
from app.core.exceptions import DataNotFoundError, DataProcessingError

logger = logging.getLogger(__name__)


class VisualizationService:
    """Service for processing and preparing data for visualization."""

    def __init__(self, data_repo: DataRepository, filename: str):
        self.data_repo = data_repo
        self.filename = filename

    def get_timeseries_data(self, **filters: Optional[str]) -> TimeseriesResponse:
        """
        Generate timeseries data for visualization by filtering and aggregating the dataset.
        """
        try:
            df = self.data_repo.get_csv_data(filename=self.filename)
            if df is None or df.empty:
                raise DataNotFoundError("No CSV data available")

            df_filtered = self._apply_filters(df, filters)
            date_col = "year"
            value_cols = ["value"]

            # Prepare visualization data
            if not df_filtered.empty:
                # Aggregate "value" by sum, keep other columns as-is
                agg_dict = {
                    col: "sum" if col == "value" else "first" for col in value_cols
                }
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

            return TimeseriesResponse(
                x_axis=x_axis,
                y_axes=y_axes,
                x_label=date_col,
                y_labels=value_cols,
                available_columns=value_cols,
                filter_options=self.get_available_filters(),
                data_count=len(df_filtered),
                total_data_points=len(df),
                filtered=self._has_active_filters(filters),
            )

        except (DataNotFoundError, DataProcessingError) as e:
            logger.error(f"A known data error occurred: {e}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred in get_timeseries_data: {e}")
            raise DataProcessingError(f"Failed to process timeseries data: {e}")

    def _apply_filters(
        self, df: pd.DataFrame, filters: Dict[str, Optional[str]]
    ) -> pd.DataFrame:
        """Apply a dictionary of filters to the DataFrame."""
        df_filtered = df.copy()

        for key, value in filters.items():
            if value is None or key not in df_filtered.columns:
                continue

            df_filtered = df_filtered[df_filtered[key].astype(str) == str(value)]

            if df_filtered.empty:
                logger.warning(f"Filter {key}={value} resulted in empty dataset.")
                break

        return df_filtered

    def _has_active_filters(self, filters: Dict[str, Optional[str]]) -> bool:
        """Check if any filter values have been provided."""
        return any(val is not None for val in filters.values())

    def get_available_filters(self) -> Dict[str, List[str]]:
        """Get unique, sorted values for all potential filter columns."""
        try:
            df = self.data_repo.get_csv_data(filename=self.filename)
            if df is None or df.empty:
                return {}

            filter_columns = [
                "model",
                "scenario",
                "region",
                "species_group",
                "forest_land",
                "item",
                "variable",
                "unit",
            ]

            return {
                col: sorted(df[col].dropna().unique().astype(str))
                for col in filter_columns
                if col in df.columns
            }

        except Exception as e:
            logger.error(f"Error getting available filters: {str(e)}")
            return {}
