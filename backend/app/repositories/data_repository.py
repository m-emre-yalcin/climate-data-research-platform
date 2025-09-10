from typing import Optional, Dict, Any
import pandas as pd


class DataRepository:
    data_store = {
        "csv_data": None,
        "raster_data": None,
        "cleaning_report": None,
    }

    @classmethod
    def store_csv_data(cls, df: pd.DataFrame, cleaning_report: Dict[str, Any]) -> None:
        cls.data_store["csv_data"] = df
        cls.data_store["cleaning_report"] = cleaning_report

    @classmethod
    def get_csv_data(cls) -> Optional[pd.DataFrame]:
        return cls.data_store["csv_data"]

    @classmethod
    def get_cleaning_report(cls) -> Optional[Dict[str, Any]]:
        return cls.data_store["cleaning_report"]

    @classmethod
    def store_raster_data(cls, raster_info: Dict[str, Any]) -> None:
        cls.data_store["raster_data"] = raster_info

    @classmethod
    def get_raster_data(cls) -> Optional[Dict[str, Any]]:
        return cls.data_store["raster_data"]

    @classmethod
    def clear_all_data(cls):
        for key in cls.data_store:
            cls.data_store[key] = None
