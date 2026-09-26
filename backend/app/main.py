"""MangroveLens — FastAPI Application Gateway."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .core.config import settings
from .api.router import api_router
from .db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from .db.indexes import create_indexes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle."""
    # 1. Initialize MongoDB async connection if configured
    db = await connect_to_mongo()
    if db is not None:
        await create_indexes(db)
    yield
    # 2. Cleanup MongoDB client
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    description="FastAPI Backend Gateway for MangroveLens AI-Assisted Satellite Intelligence, Mangrove Ecosystem Monitoring & Indicative Carbon Estimation.",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS for local development with Vite frontend
origins = list(set([settings.FRONTEND_ORIGIN] + settings.ALLOWED_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Register API router at configured prefix (/api)
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Root"])
def root_info():
    """Root platform discovery endpoint."""
    db_status = "connected" if get_database() is not None else "offline (in-memory fallback active)"
    return JSONResponse(
        content={
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "docs": "/docs",
            "health": f"{settings.API_PREFIX}/health",
            "database_status": db_status,
            "database_name": settings.MONGODB_DATABASE,
            "api_prefix": settings.API_PREFIX,
            "message": "MangroveLens API is operational.",
        }
    )
