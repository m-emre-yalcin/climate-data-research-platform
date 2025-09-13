import pytest
import pandas as pd
from pathlib import Path
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

from app.services.csv_service import CSVService


class TestCSVService:
    def test_clean_csv_data(self):
        """Test CSV cleaning with real data"""
        csv_path = "./tests/data/cbm_all_merged_v2_anon.csv"
        df = pd.read_csv(csv_path)

        cleaned_df, report = CSVService.clean_csv_data(df)

        assert len(cleaned_df) > 0
        assert "original_shape" in report
        assert "final_shape" in report
        assert report["final_shape"] is not None
