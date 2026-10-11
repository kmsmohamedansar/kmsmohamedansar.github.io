"""Dagster runs the delivery every Monday at 06:00 and keeps a history of
every run. Open the screen with:  dagster dev -m orchestration.definitions

Three steps, each visible in Dagster's run view:
  wait_for_files   checks every customer's file is there; if not, it waits
                   and tries again (up to 6 times, 10 minutes apart)
  weekly_delivery  load, clean and test, then deliver or block
  delivery_board   rebuild the board page
"""

from dagster import (Backoff, Config, Definitions, Failure, MetadataValue, RetryPolicy, RetryRequested, ScheduleDefinition,
                     define_asset_job, asset, AssetExecutionContext)

from delivery.board import write_board
from delivery.config import load_customers
from delivery.deliver import run_week


class WeekConfig(Config):
    week: str = "2026-W41"


@asset(retry_policy=RetryPolicy(max_retries=6, delay=600, backoff=Backoff.LINEAR))
def wait_for_files(context: AssetExecutionContext, config: WeekConfig) -> dict:
    missing = [c.display_name for c in load_customers() if not c.file_for(config.week).exists()]
    if missing:
        context.log.warning(f"Waiting for: {', '.join(missing)}")
        raise RetryRequested(max_retries=6, seconds_to_wait=600)
    context.add_output_metadata({"customers": len(load_customers())})
    return {"week": config.week}


@asset(deps=[wait_for_files])
def weekly_delivery(context: AssetExecutionContext, config: WeekConfig) -> dict:
    s = run_week(config.week)
    context.add_output_metadata({
        "status": s["status"],
        "rows": MetadataValue.json(s["rows_by_customer"]),
        "alerts": MetadataValue.md("\n".join(f"- **{a['customer']}**: {a['check']}. {a['detail']}  \n  Check first: {a['check_first']}" for a in s["alerts"]) or "None"),
    })
    if s["status"] == "blocked":
        raise Failure(description="Delivery blocked: " + "; ".join(f"{a['customer']}: {a['check']}" for a in s["alerts"]),
                      metadata={"alerts": MetadataValue.json(s["alerts"])})
    return s


@asset(deps=[weekly_delivery])
def delivery_board(context: AssetExecutionContext) -> str:
    return str(write_board())


delivery_job = define_asset_job("monday_delivery", selection=[wait_for_files, weekly_delivery, delivery_board])

defs = Definitions(
    assets=[wait_for_files, weekly_delivery, delivery_board],
    jobs=[delivery_job],
    schedules=[ScheduleDefinition(job=delivery_job, cron_schedule="0 6 * * 1", execution_timezone="America/Toronto")],
)
