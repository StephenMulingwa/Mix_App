"""Sync region work directory with Vercel Blob storage."""
import os
import shutil
from pathlib import Path

import requests

BLOB_PREFIX = "mix-data"
BLOB_API = "https://blob.vercel-storage.com"

SYNC_PATTERNS = (
    "mix_report_template_",
    "Bridges/",
    "Results/",
    "/Trips/",
    "/Events/",
    "report_details.xlsx",
)


def _should_sync(rel_path: str) -> bool:
    normalized = rel_path.replace("\\", "/")
    return any(p in normalized for p in SYNC_PATTERNS)


def _token() -> str | None:
    return os.environ.get("BLOB_READ_WRITE_TOKEN")


def _headers() -> dict:
    token = _token()
    if not token:
        raise RuntimeError("BLOB_READ_WRITE_TOKEN is not set")
    return {"authorization": f"Bearer {token}"}


def list_blobs(region: str) -> list[dict]:
    prefix = f"{BLOB_PREFIX}/{region}/"
    blobs: list[dict] = []
    cursor = None

    while True:
        params: dict = {"prefix": prefix, "limit": "1000"}
        if cursor:
            params["cursor"] = cursor
        response = requests.get(BLOB_API, headers=_headers(), params=params, timeout=60)
        response.raise_for_status()
        data = response.json()
        blobs.extend(data.get("blobs", []))
        cursor = data.get("cursor")
        if not cursor:
            break

    return blobs


def download_region(region: str, work_dir: Path) -> int:
    token = _token()
    if not token:
        return 0

    work_dir.mkdir(parents=True, exist_ok=True)
    prefix = f"{BLOB_PREFIX}/{region}/"
    count = 0

    for blob in list_blobs(region):
        pathname = blob.get("pathname", "")
        if not pathname.startswith(prefix):
            continue
        rel = pathname[len(prefix) :]
        if not rel:
            continue

        dest = work_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)

        url = blob.get("downloadUrl") or blob.get("url")
        if not url:
            continue

        file_response = requests.get(url, timeout=120)
        file_response.raise_for_status()
        dest.write_bytes(file_response.content)
        count += 1

    return count


def upload_region(region: str, work_dir: Path) -> int:
    token = _token()
    if not token:
        return 0

    if not work_dir.exists():
        return 0

    count = 0
    for path in work_dir.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(work_dir).as_posix()
        if not _should_sync(rel):
            continue

        pathname = f"{BLOB_PREFIX}/{region}/{rel}"
        content = path.read_bytes()

        response = requests.put(
            f"{BLOB_API}/{pathname}",
            headers={
                **_headers(),
                "content-type": "application/octet-stream",
                "x-add-random-suffix": "0",
                "x-allow-overwrite": "1",
            },
            data=content,
            timeout=120,
        )
        response.raise_for_status()
        count += 1

    return count


def seed_from_repo(region: str, work_dir: Path, repo_root: Path) -> None:
    src = repo_root / "mix" / region
    if not src.exists():
        return
    work_dir.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        dest = work_dir / item.name
        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)


def ensure_template(region: str, work_dir: Path, repo_root: Path) -> None:
    filename = f"mix_report_template_{region.lower()}.xlsx"
    src = repo_root / "mix" / region / filename
    dest = work_dir / filename
    if src.exists():
        shutil.copy2(src, dest)


def ensure_work_dir(region: str, work_dir: Path, repo_root: Path) -> None:
    work_dir.mkdir(parents=True, exist_ok=True)
    downloaded = download_region(region, work_dir)
    has_files = any(work_dir.rglob("*"))
    if downloaded == 0 and not has_files:
        seed_from_repo(region, work_dir, repo_root)
    ensure_template(region, work_dir, repo_root)
