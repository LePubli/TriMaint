"""Point d'entrée FastAPI de l'application TriMaint."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from app.api import (
    auth, machines, pannes, interventions, pieces,
    search, stats, uploads, admin, notifications, maintenance_preventive,
    convoyeurs, base_connaissances, kpi, checklists, bons_travail,
)
from app.core.config import ALLOWED_ORIGINS, BOOTSTRAP_ADMIN, BOOTSTRAP_ADMIN_PASSWORD

# Rate limiter global
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cycle de vie de l'application.

    Crée un utilisateur admin initial UNIQUEMENT si BOOTSTRAP_ADMIN=1
    et si aucun utilisateur admin n'existe encore. Le mot de passe doit
    être fourni via BOOTSTRAP_ADMIN_PASSWORD.
    """
    if BOOTSTRAP_ADMIN:
        from app.db.database import SessionLocal
        from app.models.user import User
        from app.core.security import get_password_hash

        db = SessionLocal()
        try:
            existing = db.query(User).filter(User.username == "admin").first()
            if not existing:
                if not BOOTSTRAP_ADMIN_PASSWORD or len(BOOTSTRAP_ADMIN_PASSWORD) < 8:
                    print(
                        "ERREUR: BOOTSTRAP_ADMIN=1 mais BOOTSTRAP_ADMIN_PASSWORD "
                        "est absent ou trop court (min 8 caractères).",
                        flush=True,
                    )
                else:
                    admin_user = User(
                        username="admin",
                        email=os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com"),
                        hashed_password=get_password_hash(BOOTSTRAP_ADMIN_PASSWORD),
                        role="admin",
                        is_active=True,
                    )
                    db.add(admin_user)
                    db.commit()
                    print(
                        "Utilisateur admin initial créé. "
                        "CHANGEZ LE MOT DE PASSE IMMÉDIATEMENT via l'interface.",
                        flush=True,
                    )
        finally:
            db.close()
    yield


app = FastAPI(
    title="TriMaint API",
    description="GMAO pour Triselec",
    version="1.3.0",
    lifespan=lifespan,
)

# Rate limiting state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS restrictif : origins explicites uniquement
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=600,
)

# Routers
app.include_router(auth.router)
app.include_router(machines.router)
app.include_router(pannes.router)
app.include_router(interventions.router)
app.include_router(pieces.router)
app.include_router(search.router)
app.include_router(stats.router)
app.include_router(uploads.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(maintenance_preventive.router)
app.include_router(convoyeurs.router)
app.include_router(base_connaissances.router)
app.include_router(kpi.router)
app.include_router(checklists.router)
app.include_router(bons_travail.router)


@app.get("/api/health", tags=["health"])
def health():
    """Endpoint de santé pour les healthchecks Docker."""
    return {"status": "ok", "service": "TriMaint API", "version": "1.3.0"}