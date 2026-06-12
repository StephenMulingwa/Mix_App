"""Phase 1: Pull trips and events from MiX API."""
import sys
from pathlib import Path

import pandas as pd


def _api_group_id(group_id) -> str | None:
    gid = str(group_id).strip()
    if not gid or gid.lower() == "nan":
        return None
    gid = gid.replace("A", "")
    return gid or None


def run_pull(region: str, work_dir: str, clients: list[str] | None = None) -> str:
    region = region.upper()
    server = "mix_za" if region == "ZA" else "mix_uk"
    template = f"mix_report_template_{region.lower()}.xlsx"

    work_path = Path(work_dir)
    scripts_path = work_path / "mix_scripts"
    sys.path.insert(0, str(scripts_path))

    import mix_api_utilities  # noqa: E402

    original_cwd = Path.cwd()
    try:
        import os

        os.chdir(work_path)

        mix_api_utilities.get_bearer(server=server)

        path = template
        sub_groups_df = pd.read_excel(
            path,
            sheet_name="SubGroups",
            dtype={"parentGroupId": "object", "GroupId": "object"},
        )
        sub_groups_df = sub_groups_df[sub_groups_df.report_name.notna()]
        if clients:
            sub_groups_df = sub_groups_df[sub_groups_df.report_name.isin(clients)]
            if sub_groups_df.empty:
                return f"Pull skipped: no matching clients for {region}"

        parent_groups: list[str] = []
        for parent_group in sub_groups_df.parentGroupId.unique():
            api_id = _api_group_id(parent_group)
            if api_id and api_id not in parent_groups:
                parent_groups.append(api_id)

        if not parent_groups:
            return "Pull skipped: no valid parent group IDs in SubGroups sheet"

        assets_res = []
        drivers_res = []
        for parent_group in parent_groups:
            assets = mix_api_utilities.get_group_assets(parent_group)
            if assets:
                assets_df = pd.DataFrame(assets).astype(str)
                mix_api_utilities.id_to_string(assets_df)
                assets_res.append(assets_df)

            drivers = mix_api_utilities.get_group_drivers(parent_group)
            if drivers:
                drivers_df = pd.DataFrame(drivers).astype(str)
                mix_api_utilities.id_to_string(drivers_df)
                drivers_res.append(drivers_df)

        if not assets_res:
            return "Pull skipped: no assets found"

        assets_df = pd.concat(assets_res)
        drivers_df = pd.concat(drivers_res) if drivers_res else pd.DataFrame(
            columns=["SiteId", "DriverId", "Name"]
        )

        assets_df2 = assets_df.merge(
            sub_groups_df[["GroupId", "report_name"]].rename(columns={"GroupId": "SiteId"}),
            on="SiteId",
            how="left",
        )
        assets_df2 = assets_df2[assets_df2.report_name.notna()].copy()

        drivers_df2 = drivers_df.merge(
            sub_groups_df[["GroupId", "report_name"]].rename(columns={"GroupId": "SiteId"}),
            on="SiteId",
            how="left",
        )
        drivers_df2 = drivers_df2[drivers_df2.report_name.notna()].copy()

        mix_api_utilities.get_trips_and_events(path, assets_df2, drivers_df2, freq="1d")
        return f"Pull completed for {region}"
    finally:
        import os

        os.chdir(original_cwd)
