from fastapi import APIRouter
from app.api.v1.endpoints import auth, upload, data, visualization

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(upload.router, prefix="/upload", tags=["File Upload"])
api_router.include_router(data.router, prefix="/data", tags=["Data Management"])
api_router.include_router(
    visualization.router, prefix="/data/visualization", tags=["Data Visualization"]
)
