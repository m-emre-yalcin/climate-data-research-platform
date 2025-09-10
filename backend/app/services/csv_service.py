import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any
import logging
from app.core.exceptions import DataProcessingError

logger = logging.getLogger(__name__)


class CSVService:
    @staticmethod
    def clean_csv_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Clean and standardize the CSV data"""
        cleaning_report = {
            "original_shape": df.shape,
            "issues_found": [],
            "fixes_applied": [],
            "final_shape": None,
        }

        try:
            # Handle missing/inconsistent headers
            if df.columns[0] == "Unnamed: 0" or any(
                "Unnamed:" in col for col in df.columns
            ):
                cleaning_report["issues_found"].append(
                    "Missing or unnamed headers detected"
                )
                if df.iloc[0].notna().sum() > df.iloc[1].notna().sum():
                    df.columns = df.iloc[0]
                    df = df.drop(df.index[0]).reset_index(drop=True)
                    cleaning_report["fixes_applied"].append("Used first row as headers")

            # Clean column names
            df.columns = (
                df.columns.astype(str).str.strip().str.lower().str.replace(" ", "_")
            )

            # Detect and standardize date columns
            date_columns = []
            for col in df.columns:
                if any(
                    keyword in col.lower()
                    for keyword in ["date", "time", "year", "month"]
                ):
                    try:
                        if df[col].dtype == "object":
                            df[col] = pd.to_datetime(
                                df[col], errors="coerce", infer_datetime_format=True
                            )
                            if df[col].notna().sum() > 0:
                                date_columns.append(col)
                                cleaning_report["fixes_applied"].append(
                                    f"Standardized date format in column: {col}"
                                )
                    except Exception as e:
                        logger.warning(f"Could not parse dates in column {col}: {e}")

            # Handle missing values
            missing_before = df.isnull().sum().sum()
            if missing_before > 0:
                cleaning_report["issues_found"].append(
                    f"Found {missing_before} missing values"
                )

                for col in df.columns:
                    if df[col].dtype in ["float64", "int64"]:
                        median_val = df[col].median()
                        df[col].fillna(median_val, inplace=True)
                        cleaning_report["fixes_applied"].append(
                            f"Filled missing numeric values in {col} with median"
                        )
                    elif df[col].dtype == "object" and col not in date_columns:
                        mode_val = (
                            df[col].mode().iloc[0]
                            if not df[col].mode().empty
                            else "Unknown"
                        )
                        df[col].fillna(mode_val, inplace=True)
                        cleaning_report["fixes_applied"].append(
                            f"Filled missing categorical values in {col} with mode"
                        )

            # Detect and standardize temperature units
            temp_columns = [
                col
                for col in df.columns
                if any(keyword in col.lower() for keyword in ["temp", "temperature"])
            ]
            for col in temp_columns:
                if df[col].dtype in ["float64", "int64"]:
                    if df[col].mean() > 50:
                        df[col] = (df[col] - 32) * 5 / 9
                        cleaning_report["fixes_applied"].append(
                            f"Converted {col} from Fahrenheit to Celsius"
                        )

            # Remove duplicate rows
            duplicates = df.duplicated().sum()
            if duplicates > 0:
                df = df.drop_duplicates()
                cleaning_report["issues_found"].append(
                    f"Found {duplicates} duplicate rows"
                )
                cleaning_report["fixes_applied"].append("Removed duplicate rows")

            cleaning_report["final_shape"] = df.shape
            cleaning_report["columns_after"] = df.columns.tolist()

            return df, cleaning_report

        except Exception as e:
            logger.error(f"Error cleaning CSV data: {e}")
            raise DataProcessingError(f"Error cleaning CSV data: {str(e)}")

    @staticmethod
    def get_data_summary(df: pd.DataFrame) -> Dict[str, Any]:
        """Generate comprehensive summary of CSV data"""
        summary = {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "columns": df.columns.tolist(),
            "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
            "categorical_columns": df.select_dtypes(
                include=["object"]
            ).columns.tolist(),
            "date_columns": df.select_dtypes(include=["datetime64"]).columns.tolist(),
            "memory_usage_mb": df.memory_usage(deep=True).sum() / 1024 / 1024,
        }

        # Add specific insights for research data
        if "Model" in df.columns:
            summary["models"] = df["Model"].value_counts().to_dict()
        if "scenario" in df.columns:
            summary["scenarios"] = df["scenario"].value_counts().to_dict()
        if "region" in df.columns:
            summary["regions"] = df["region"].value_counts().head(10).to_dict()
        if "year" in df.columns:
            summary["year_range"] = {
                "min": int(df["year"].min()),
                "max": int(df["year"].max()),
                "count": int(df["year"].nunique()),
            }
        if "value" in df.columns:
            summary["value_stats"] = {
                "min": float(df["value"].min()),
                "max": float(df["value"].max()),
                "mean": float(df["value"].mean()),
                "median": float(df["value"].median()),
                "std": float(df["value"].std()),
            }

        return summary
