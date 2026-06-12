"""Phase 2: Transform raw data into fleet reports."""
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd


def _current_period() -> str:
    now = datetime.now(ZoneInfo("Africa/Nairobi"))
    return now.strftime("%b %Y")


def _parse_from_to(time_source) -> tuple[pd.Timestamp, pd.Timestamp]:
    time_df = pd.read_excel(time_source, sheet_name="Time", index_col="Name")
    from_row = time_df.loc["FROM"]
    to_row = time_df.loc["TO"]
    FROM = datetime(
        int(from_row.year),
        int(from_row.month),
        int(from_row.day),
        int(from_row.hour),
        int(from_row.minute),
        int(from_row.second),
    )
    TO = datetime(
        int(to_row.year),
        int(to_row.month),
        int(to_row.day),
        int(to_row.hour),
        int(to_row.minute),
        int(to_row.second),
    )
    return pd.Timestamp(FROM), pd.Timestamp(TO)


def _period_from_template(path: str) -> str:
    FROM, _ = _parse_from_to(path)
    return FROM.strftime("%b %Y")


def _dir_has_trip_files(trips_dir: Path) -> bool:
    if not trips_dir.exists():
        return False
    return any(trips_dir.glob("*.xlsx"))


def _has_pulled_data(organisations: list[Path]) -> bool:
    if not organisations:
        return False

    details = organisations[0].joinpath("report_details.xlsx")
    if not details.exists():
        return False

    trips_dirs = [o.joinpath("Trips") for o in organisations]
    return any(_dir_has_trip_files(d) for d in trips_dirs)


def _read_trips_frames(mix_api_utilities, trips_dirs: list[Path]) -> list[pd.DataFrame]:
    frames = []
    for trips_dir in trips_dirs:
        if not _dir_has_trip_files(trips_dir):
            continue
        frames.append(mix_api_utilities.read_mix_api_trips(trips_dir))
    return frames


def _read_events_frames(mix_api_utilities, events_dirs: list[Path]) -> list[pd.DataFrame]:
    frames = []
    for events_dir in events_dirs:
        if not events_dir.exists():
            continue
        if not any(events_dir.glob("*.xlsx")):
            continue
        frames.append(mix_api_utilities.read_mix_api_events(events_dir))
    return frames


def _filter_by_clients(reports_df: pd.DataFrame, clients: list[str] | None) -> pd.DataFrame:
    if clients:
        reports_df = reports_df[reports_df.report_name.isin(clients)]
    return reports_df


def _run_standard_transform(
    mix_api_utilities,
    path: str,
    period: str,
    driver_reports: list[str],
    clients: list[str] | None = None,
) -> tuple[int, list[str]]:
    reports_df = pd.read_excel(path, sheet_name="Reports")
    reports_df = reports_df[reports_df.to_pull > 0]
    reports_df = _filter_by_clients(reports_df, clients)
    report_gbs = reports_df.groupby("report_name")
    count = 0
    skipped: list[str] = []

    for report_name, report_group in report_gbs:
        file_name = f"{report_name} Monthly Fleet Report {period}"
        report_result_file_name = Path(f"Results/{report_name}").joinpath(f"{file_name}.xlsx")
        if report_result_file_name.exists():
            continue

        organisations = [Path(o) for o in report_group.report_dirs.unique()]
        if not _has_pulled_data(organisations):
            skipped.append(f"{report_name} (no pulled data)")
            print(f"Skipping {report_name}: no pulled data")
            continue

        trips_dirs = [o.joinpath("Trips") for o in organisations]
        events_dirs = [o.joinpath("Events") for o in organisations]

        trips_frames = _read_trips_frames(mix_api_utilities, trips_dirs)
        events_frames = _read_events_frames(mix_api_utilities, events_dirs)

        if not trips_frames:
            skipped.append(f"{report_name} (empty trips)")
            print(f"Skipping {report_name}: no trip files")
            continue

        trips_df_original = pd.concat(trips_frames)
        events_df_original = (
            pd.concat(events_frames) if events_frames else pd.DataFrame()
        )

        mix_api_utilities.write_bridge_events_df(events_df_original, report_name=report_name)
        events_df = mix_api_utilities.read_bridge_events_df(events_df_original, report_name=report_name)
        trips_df = trips_df_original.copy()

        FROM, TO = _parse_from_to(organisations[0].joinpath("report_details.xlsx"))

        entity_column_name = ["AssetDescription", "RegistrationNumber"]
        if report_name in driver_reports:
            entity_column_name = ["ReportName", "DriverName"]

        rag_score = mix_api_utilities.make_rag_score(
            trips_df, events_df, entity_column_name=entity_column_name
        )
        utilization = mix_api_utilities.make_daily_utilization(trips_df, FROM, TO)
        fuel_report = mix_api_utilities.make_fuel_report(trips_df)

        entity_col = "RegistrationNumber"
        if report_name in driver_reports:
            entity_col = "DriverName"

        top_n, top_n2 = mix_api_utilities.write_top_n(
            events_df, trips_df, entity_column_name=entity_col
        )

        out_path = Path(f"Results/{report_name}")
        out_path.mkdir(parents=True, exist_ok=True)
        writer = pd.ExcelWriter(out_path.joinpath(f"{file_name}.xlsx"))
        rag_score.to_excel(writer, sheet_name="Scoring")
        rag_score.to_excel(writer, sheet_name="Analysis")
        utilization.to_excel(writer, sheet_name="Utilization")
        fuel_report.to_excel(writer, sheet_name="Fuel")
        top_n.to_excel(writer, sheet_name="Top1")
        top_n2.to_excel(writer, sheet_name="Top2")
        writer.close()
        count += 1

    return count, skipped


def _run_umbrella_transform(
    mix_api_utilities,
    path: str,
    period: str,
    driver_reports: list[str],
    clients: list[str] | None = None,
) -> tuple[int, list[str]]:
    reports_df = pd.read_excel(path, sheet_name="Reports")
    reports_df = reports_df[reports_df.to_pull_umbrella > 0]
    reports_df = _filter_by_clients(reports_df, clients)
    report_gbs = reports_df.groupby("report_name")
    Path("Results").mkdir(exist_ok=True)
    count = 0
    skipped: list[str] = []

    for report_name, report_group in report_gbs:
        file_name = f"{report_name} Monthly Fleet Report {period}"
        report_result_file_name = Path(f"Results/{report_name}").joinpath(f"{file_name}.xlsx")
        if report_result_file_name.exists():
            continue

        organisations = [Path(o) for o in report_group.report_dirs.unique()]
        if not _has_pulled_data(organisations):
            skipped.append(f"{report_name} (no pulled data)")
            print(f"Skipping {report_name}: no pulled data")
            continue

        trips_dirs = [o.joinpath("Trips") for o in organisations]
        events_dirs = [o.joinpath("Events") for o in organisations]

        trips_frames = _read_trips_frames(mix_api_utilities, trips_dirs)
        events_frames = _read_events_frames(mix_api_utilities, events_dirs)

        if not trips_frames:
            skipped.append(f"{report_name} (empty trips)")
            print(f"Skipping {report_name}: no trip files")
            continue

        trips_df_original = pd.concat(trips_frames)
        events_df_original = (
            pd.concat(events_frames) if events_frames else pd.DataFrame()
        )

        mix_api_utilities.write_bridge_events_df(events_df_original, report_name=report_name)
        events_df = mix_api_utilities.read_bridge_events_df(events_df_original, report_name=report_name)
        trips_df = trips_df_original.copy()

        FROM, TO = _parse_from_to(organisations[0].joinpath("report_details.xlsx"))

        entity_column_name = ["DriverName"]
        if report_name in driver_reports:
            entity_column_name = ["DriverName"]

        rag_score = mix_api_utilities.make_rag_score(
            trips_df, events_df, entity_column_name=entity_column_name
        )
        utilization = mix_api_utilities.make_daily_utilization(trips_df, FROM, TO)
        fuel_report = mix_api_utilities.make_fuel_report(trips_df)

        entity_col = "AssetDescription"
        top_n, top_n2 = mix_api_utilities.write_top_n(
            events_df, trips_df, entity_column_name=entity_col
        )

        out_path = Path(f"Results/{report_name}")
        out_path.mkdir(parents=True, exist_ok=True)
        writer = pd.ExcelWriter(out_path.joinpath(f"{file_name}.xlsx"))
        rag_score.to_excel(writer, sheet_name="Scoring")
        rag_score.to_excel(writer, sheet_name="Analysis")
        utilization.to_excel(writer, sheet_name="Utilization")
        fuel_report.to_excel(writer, sheet_name="Fuel")
        writer.close()

        writer2 = pd.ExcelWriter(out_path.joinpath("Top N.xlsx"))
        top_n.to_excel(writer2, sheet_name="Top1")
        top_n2.to_excel(writer2, sheet_name="Top2")
        writer2.close()

        distance_col_name = "DistanceKilometers"
        entity_vehicle_trip = trips_df.pivot_table(
            values=distance_col_name,
            index=["ReportName", "RegistrationNumber"],
            aggfunc="sum",
        ).reset_index()
        entity_vehicle_trip.groupby("ReportName")[distance_col_name].describe().fillna(0).to_excel(
            f"Results/{report_name}/Trips_Summary.xlsx"
        )

        count_col_name = "TotalOccurances"
        index = ["SiteName", "DriverName"]
        entity_vehicle_event = events_df.pivot_table(
            values=count_col_name, index=index, aggfunc="sum"
        ).reset_index()
        entity_vehicle_event.groupby("SiteName")[count_col_name].describe().fillna(0).to_excel(
            f"Results/{report_name}/Events_Summary2.xlsx"
        )

        sites_pivot_events = events_df.pivot_table(
            values=count_col_name,
            columns="SiteName",
            index="EventName",
            aggfunc=sum,
        )
        sites_pivot_events.fillna(0).T.to_excel(f"Results/{report_name}/Events vs Sites.xlsx")
        count += 1

    return count, skipped


def run_transform(
    region: str,
    work_dir: str,
    period: str | None = None,
    clients: list[str] | None = None,
) -> str:
    region = region.upper()
    work_path = Path(work_dir)
    template = f"mix_report_template_{region.lower()}.xlsx"
    template_path = work_path / template
    period = period or _period_from_template(str(template_path))
    scripts_path = work_path / "mix_scripts"
    sys.path.insert(0, str(scripts_path))

    import mix_api_utilities  # noqa: E402

    if region == "ZA":
        driver_reports = ["Murban Movers", "Freight Forwaders Solutions Ltd"]
        umbrella_driver_reports = ["Total Kenya HV", "Total Uganda"]
    else:
        driver_reports = []
        umbrella_driver_reports = []

    original_cwd = Path.cwd()
    try:
        import os

        os.chdir(work_path)

        standard_count, standard_skipped = _run_standard_transform(
            mix_api_utilities, template, period, driver_reports, clients
        )
        umbrella_count, umbrella_skipped = _run_umbrella_transform(
            mix_api_utilities, template, period, umbrella_driver_reports, clients
        )

        skipped = standard_skipped + umbrella_skipped
        msg = (
            f"Transform completed: {standard_count} standard + {umbrella_count} umbrella "
            f"reports for {period}"
        )
        if skipped:
            msg += f". Skipped {len(skipped)}: {', '.join(skipped[:5])}"
            if len(skipped) > 5:
                msg += f" (+{len(skipped) - 5} more)"
        return msg
    finally:
        import os

        os.chdir(original_cwd)
