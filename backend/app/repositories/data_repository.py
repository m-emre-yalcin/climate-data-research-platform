from typing import Optional, Dict, Any, List
import pandas as pd
import json
from pathlib import Path


class DataRepository:
    UPLOADS_DIR = Path.cwd() / "app/uploads"

    @classmethod
    def _get_file_path(cls, username: str = "", filename: str = "") -> Path:
        """Generate file path with username_filename convention"""
        return (
            cls.UPLOADS_DIR / f"{username}_{filename}"
            if not filename.startswith(username)
            else cls.UPLOADS_DIR / filename
        )

    @classmethod
    def _get_metadata_path(cls, username: str = "", filename: str = "") -> Path:
        """Generate metadata file path"""
        return (
            cls.UPLOADS_DIR / f"{username}_{filename}.metadata.json"
            if not filename.startswith(username)
            else cls.UPLOADS_DIR / f"{filename}.metadata.json"
        )

    @classmethod
    def store_csv_data(
        cls,
        df: pd.DataFrame,
        cleaning_report: Dict[str, Any],
        metadata: Dict[str, Any],
    ) -> None:
        """Store cleaning report and metadata (CSV file already saved)"""
        metadata_path = cls._get_metadata_path(
            username=metadata["username"], filename=metadata["filename"]
        )

        metadata_content = {
            "metadata": metadata,
            "cleaning_report": cleaning_report,
        }

        with open(metadata_path, "w") as f:
            json.dump(metadata_content, f, indent=2)

    @classmethod
    def get_csv_data(
        cls, username: str = "", filename: str = ""
    ) -> Optional[pd.DataFrame]:
        """Read CSV data from filesystem"""
        file_path = cls._get_file_path(username=username, filename=filename)
        if file_path.exists():
            return pd.read_csv(file_path)
        return None

    @classmethod
    def get_cleaning_report(
        cls, username: str = "", filename: str = ""
    ) -> Optional[Dict[str, Any]]:
        """Get cleaning report from metadata file"""
        metadata_path = cls._get_metadata_path(username=username, filename=filename)
        if metadata_path.exists():
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
                return metadata.get("cleaning_report")
        return None

    @classmethod
    def store_raster_data(cls, raster_info: Dict[str, Any]) -> None:
        """Store raster metadata (raster file already saved)"""
        metadata = raster_info.get("metadata", {})
        metadata_path = cls._get_metadata_path(
            username=metadata["username"], filename=metadata["filename"]
        )

        with open(metadata_path, "w") as f:
            json.dump(raster_info, f, indent=2)

    @classmethod
    def get_raster_data(
        cls, username: str = "", filename: str = ""
    ) -> Optional[Dict[str, Any]]:
        """Get raster metadata from file"""
        metadata_path = cls._get_metadata_path(username=username, filename=filename)
        if metadata_path.exists():
            with open(metadata_path, "r") as f:
                return json.load(f)
        return None

    @classmethod
    def get_netcdf_file_content(
        cls, username: str = "", filename: str = ""
    ) -> Optional[bytes]:
        """Get NetCDF file content as bytes"""
        file_path = cls._get_file_path(username=username, filename=filename)
        if file_path.exists() and file_path.suffix == ".nc":
            try:
                with open(file_path, "rb") as f:
                    return f.read()
            except OSError:
                pass
        return None

    @classmethod
    def get_user_files(cls, username: str) -> List[Dict[str, Any]]:
        """Get list of files (list of file metadatas) for a specific user"""
        metadata_list = []
        pattern = f"{username}_*.metadata.json"
        for file_path in cls.UPLOADS_DIR.glob(pattern):
            with open(file_path, "r") as f:
                file_content = json.load(f)
                metadata = file_content.get("metadata", {})

                filename = metadata.get("filename")
                file_type = metadata.get("file_type")
                metadata = {
                    **file_content,
                    "name": filename,
                    "type": file_type,
                }

                metadata_list.append(metadata)
        return metadata_list

    @classmethod
    def clear_data_by_filename(cls, filename: str, username: str):
        """Delete file and metadata for specific user's filename"""
        file_path = cls._get_file_path(filename=filename, username=username)
        metadata_path = cls._get_metadata_path(filename=filename, username=username)

        for path in [file_path, metadata_path]:
            if path.exists():
                try:
                    path.unlink()
                except OSError:
                    pass
