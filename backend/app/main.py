from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from app.config import settings
from app.api.v1.router import api_router
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_TITLE,
        description=settings.APP_DESCRIPTION,
        version=settings.APP_VERSION,
    )

    # Add CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API router
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/", response_class=HTMLResponse)
    async def root():
        return f"""
          <!DOCTYPE html>
          <html>
          <head>
              <title>{settings.APP_TITLE}</title>
          </head>
          <body>
              <h1>{settings.APP_TITLE} API</h1>
              <p>API is running. Visit <a href="/docs">/docs</a> for interactive documentation.</p>
              <p>Default credentials: username=researcher, password=iiasa_climate123</p>
          </body>
          </html>
        """

    return app


app = create_application()

if __name__ == "main":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
