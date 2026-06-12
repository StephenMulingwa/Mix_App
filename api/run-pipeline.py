from http.server import BaseHTTPRequestHandler
import json
import os
import shutil
import sys
import traceback
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from pipeline.blob_sync import download_region, upload_region, ensure_work_dir  # noqa: E402
from pipeline.pull_data import run_pull  # noqa: E402
from pipeline.transform import run_transform  # noqa: E402


def ensure_mix_scripts(work_dir: Path, region: str) -> None:
    scripts_dest = work_dir / "mix_scripts"
    scripts_src = ROOT / "mix" / region / "mix_scripts"
    if scripts_src.exists():
        shutil.copytree(scripts_src, scripts_dest, dirs_exist_ok=True)


def run_pipeline(
    region: str,
    work_dir: str,
    clients: list[str] | None = None,
) -> dict:
    region = region.upper()
    work_path = Path(work_dir)
    work_path.mkdir(parents=True, exist_ok=True)

    ensure_work_dir(region, work_path, ROOT)
    ensure_mix_scripts(work_path, region)

    messages = []
    try:
        downloaded = download_region(region, work_path)
        if downloaded:
            messages.append(f"Downloaded {downloaded} file(s) from blob")

        messages.append(run_pull(region, str(work_path), clients))
        messages.append(run_transform(region, str(work_path), None, clients))

        uploaded = upload_region(region, work_path)
        messages.append(f"Uploaded {uploaded} file(s) to blob")

        return {"ok": True, "message": "\n".join(messages)}
    except Exception as exc:
        return {
            "ok": False,
            "message": str(exc),
            "trace": traceback.format_exc(),
        }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._handle_request()

    def do_POST(self):
        self._handle_request()

    def _handle_request(self):
        secret = os.environ.get("CRON_SECRET")
        if secret:
            auth = self.headers.get("Authorization", "")
            cron = self.headers.get("x-vercel-cron", "")
            if cron != "1" and auth != f"Bearer {secret}":
                self._respond(401, {"ok": False, "message": "Unauthorized"})
                return

        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        region = (params.get("region") or ["ZA"])[0].upper()
        clients_raw = (params.get("clients") or [""])[0]
        clients = [c.strip() for c in clients_raw.split(",") if c.strip()] or None

        if region not in ("UK", "ZA"):
            self._respond(400, {"ok": False, "message": "Invalid region"})
            return

        work_base = os.environ.get("MIX_WORK_DIR", "/tmp/mix")
        work_dir = str(Path(work_base) / region)

        result = run_pipeline(region, work_dir, clients)
        status = 200 if result["ok"] else 500
        self._respond(status, result)

    def _respond(self, status: int, body: dict):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        return
