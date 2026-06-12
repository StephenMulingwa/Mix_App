"""Main pipeline entry point."""
import argparse
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from pipeline.pull_data import run_pull  # noqa: E402
from pipeline.transform import run_transform  # noqa: E402


def ensure_mix_scripts(work_dir: Path, region: str) -> None:
    scripts_dest = work_dir / "mix_scripts"
    scripts_src = ROOT / "mix" / region / "mix_scripts"
    if scripts_src.exists():
        shutil.copytree(scripts_src, scripts_dest, dirs_exist_ok=True)


def ensure_template(work_dir: Path, region: str) -> None:
    filename = f"mix_report_template_{region.lower()}.xlsx"
    dest = work_dir / filename
    src = ROOT / "mix" / region / filename
    if not src.exists():
        raise FileNotFoundError(f"Report template not found: {src}")
    shutil.copy2(src, dest)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run MIX report pipeline")
    parser.add_argument("--region", required=True, choices=["UK", "ZA", "uk", "za"])
    parser.add_argument("--work-dir", required=True)
    parser.add_argument("--skip-pull", action="store_true")
    parser.add_argument("--period", default=None)
    parser.add_argument("--clients", default=None, help="Comma-separated report_name filter")
    parser.add_argument("--from", dest="from_dt", default=None)
    parser.add_argument("--to", dest="to_dt", default=None)
    args = parser.parse_args()

    clients = None
    if args.clients:
        clients = [c.strip() for c in args.clients.split(",") if c.strip()]

    region = args.region.upper()
    work_dir = Path(args.work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)

    ensure_mix_scripts(work_dir, region)
    ensure_template(work_dir, region)

    messages = []

    if not args.skip_pull:
        messages.append(run_pull(region, str(work_dir), clients))

    messages.append(run_transform(region, str(work_dir), args.period, clients))

    print("\n".join(messages))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
