"""Upload de fichiers avec validation MIME par magic bytes."""
import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import aiofiles
from app.core.config import UPLOAD_DIR, MAX_UPLOAD_SIZE
from app.core.security import get_current_user

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

# Extension -> magic bytes signatures (premiers octets)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".webp"}

MIME_SIGNATURES = {
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".gif": [b"GIF87a", b"GIF89a"],
    ".pdf": [b"%PDF"],
    ".webp": [b"RIFF"],  # RIFF....WEBP
}

# MIME types pour les en-têtes de réponse
MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".webp": "image/webp",
}


def _validate_magic_bytes(content: bytes, ext: str) -> bool:
    """Vérifie que le contenu correspond à l'extension déclarée via magic bytes."""
    signatures = MIME_SIGNATURES.get(ext, [])
    if not signatures:
        return False
    for sig in signatures:
        if content.startswith(sig):
            # Cas spécial WEBP : vérifier aussi "WEBP" à l'offset 8
            if ext == ".webp" and len(content) >= 12:
                return content[8:12] == b"WEBP"
            return True
    return False


@router.post("/")
async def upload_file(file: UploadFile = File(...), _=Depends(get_current_user)):
    """Upload un fichier avec validation stricte :
    - extension autorisée
    - taille <= MAX_UPLOAD_SIZE
    - magic bytes correspondant à l'extension
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non autorisé. Autorisés : {sorted(ALLOWED_EXTENSIONS)}",
        )

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux (max {MAX_UPLOAD_SIZE // (1024 * 1024)} Mo)",
        )

    if not _validate_magic_bytes(content, ext):
        raise HTTPException(
            status_code=400,
            detail="Le contenu du fichier ne correspond pas à son extension (validation magic bytes échouée)",
        )

    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    return {"filename": filename, "url": f"/api/uploads/{filename}"}


@router.get("/{filename}")
async def get_file(filename: str, _=Depends(get_current_user)):
    """Télécharge un fichier uploadé (protégé contre path traversal)."""
    # Sécurité : nom de fichier simple uniquement
    safe_name = os.path.basename(filename)
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")

    filepath = os.path.join(UPLOAD_DIR, safe_name)
    safe_path = os.path.realpath(filepath)
    safe_dir = os.path.realpath(UPLOAD_DIR)
    if not safe_path.startswith(safe_dir + os.sep):
        raise HTTPException(status_code=403, detail="Accès refusé")

    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Fichier introuvable")

    ext = os.path.splitext(safe_name)[1].lower()
    media_type = MIME_TYPES.get(ext, "application/octet-stream")
    return FileResponse(filepath, media_type=media_type, filename=safe_name)
