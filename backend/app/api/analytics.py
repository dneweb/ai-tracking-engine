from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from app.services.clerk_auth import get_admin_user, get_current_user
from app.services.database import async_queries, async_documents
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def _fetch_queries_in_range(start_date: date, end_date: date) -> List[Dict[str, Any]]:
    """
    Fetch raw queries rows where created_at falls within [start_date, end_date).
    """
    start_iso = start_date.isoformat() + "T00:00:00"
    end_iso = end_date.isoformat() + "T00:00:00"

    cursor = async_queries.find({
        "created_at": {"$gte": start_iso, "$lt": end_iso}
    }, {"created_at": 1})
    
    results = await cursor.to_list(length=None)
    return results


def _group_by_date(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Group a list of query_log rows by their DATE (YYYY-MM-DD).
    Returns a dict like {"2026-02-18": 5, "2026-02-19": 12, ...}
    """
    counts: Dict[str, int] = {}
    for row in rows:
        raw_ts = row.get("created_at", "")
        if not raw_ts:
            continue
        try:
            dt = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
            day_str = dt.date().isoformat()
            counts[day_str] = counts.get(day_str, 0) + 1
        except (ValueError, AttributeError):
            continue
    return counts


def _build_full_timeline(counts: Dict[str, int], start_date: date, num_days: int) -> List[Dict]:
    """
    Build a complete list of {date, count} dicts for every day in the range,
    filling gaps with count=0.
    """
    timeline = []
    for i in range(num_days):
        day = start_date + timedelta(days=i)
        day_str = day.isoformat()
        timeline.append({"date": day_str, "count": counts.get(day_str, 0)})
    return timeline


def _calculate_trend(current_total: int, previous_total: int) -> float:
    if previous_total == 0:
        return 100.0 if current_total > 0 else 0.0
    return round(((current_total - previous_total) / previous_total) * 100, 1)


@router.get("/timeline")
async def get_timeline(
    background_tasks_unused: None = None,
    days: int = Query(default=30, ge=1, le=365, description="Number of days to include (1–365)"),
    _: dict = Depends(get_admin_user),
):
    try:
        today = datetime.now(timezone.utc).date()

        current_start = today - timedelta(days=days)
        current_rows = await _fetch_queries_in_range(current_start, today)
        current_counts = _group_by_date(current_rows)
        current_timeline = _build_full_timeline(current_counts, current_start, days)
        current_total = sum(e["count"] for e in current_timeline)

        previous_start = today - timedelta(days=days * 2)
        previous_rows = await _fetch_queries_in_range(previous_start, current_start)
        previous_counts = _group_by_date(previous_rows)
        previous_total = sum(previous_counts.values())

        trend = _calculate_trend(current_total, previous_total)

        return {
            "timeline": current_timeline,
            "total_period": current_total,
            "trend_vs_previous": trend,
        }

    except Exception as e:
        print(f"Analytics timeline error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to fetch timeline data: {str(e)}"}
        )


@router.get("/stats")
async def get_stats(
    days: int = Query(default=30, ge=1, le=365),
    _: dict = Depends(get_current_user),
):
    """
    Optimized function to retrieve statistics for a given date range.
    Reduces data fetched from the database by using projections and indexing.
    """
    try:
        today = datetime.now(timezone.utc).date()
        current_start = today - timedelta(days=days)
        previous_start = today - timedelta(days=days * 2)

        current_start_iso = current_start.isoformat() + "T00:00:00"
        previous_start_iso = previous_start.isoformat() + "T00:00:00"
        today_iso = today.isoformat() + "T23:59:59"

        # Use projections to fetch only required fields
        current_ep = {
            "created_at": {"$gte": current_start_iso, "$lt": today_iso}
        }
        cursor_curr = async_queries.find(
            current_ep, {"_id": 1, "confidence_score": 1, "category": 1}
        )
        current_rows = await cursor_curr.to_list(length=None)

        prev_ep = {
            "created_at": {"$gte": previous_start_iso, "$lt": current_start_iso}
        }
        cursor_prev = async_queries.find(
            prev_ep, {"_id": 1, "confidence_score": 1, "category": 1}
        )
        previous_rows = await cursor_prev.to_list(length=None)

        # Calculate statistics
        current_count = len(current_rows)
        previous_count = len(previous_rows)
        trend = ((current_count - previous_count) / previous_count * 100) if previous_count > 0 else 0

        return {
            "current_count": current_count,
            "previous_count": previous_count,
            "trend": trend,
        }

    except Exception as e:
        print(f"Error in get_stats: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Failed to fetch stats"}
        )


@router.get("/low-confidence")
async def get_low_confidence(
    limit: int = Query(default=10, ge=1, le=100),
    threshold: float = Query(default=0.6, ge=0.0, le=1.0),
    offset: int = Query(default=0, ge=0),
    sort_by: str = Query(default="confidence", regex="^(confidence|date)$"),
    sort_order: str = Query(default="asc", regex="^(asc|desc)$"),
    _: dict = Depends(get_admin_user),
):
    """Return queries with confidence below the given threshold."""
    try:
        order_col = "confidence_score" if sort_by == "confidence" else "created_at"
        sort_dir = 1 if sort_order == "asc" else -1
        
        cursor = async_queries.find(
            {"confidence_score": {"$lt": threshold}},
            {"_id": 1, "question": 1, "answer": 1, "confidence_score": 1, "retrieved_doc_title": 1, "category": 1, "created_at": 1}
        ).sort(order_col, sort_dir).skip(offset).limit(limit)
        
        raw_rows = await cursor.to_list(length=None)
        
        # normalize
        rows = []
        for r in raw_rows:
            r["id"] = str(r.pop("_id", ""))
            rows.append(r)

        total_count = await async_queries.count_documents({"confidence_score": {"$lt": threshold}})
        
        return {
            "queries": rows,
            "total": total_count,
            "limit": limit,
            "offset": offset,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to fetch low confidence queries: {str(e)}"}
        )


@router.get("/document-usage")
async def get_document_usage(_: dict = Depends(get_current_user)):
    """
    Optimized function to calculate document usage statistics using MongoDB aggregation pipelines.
    """
    try:
        pipeline = [
            {
                "$group": {
                    "_id": "$retrieved_doc_title",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            },
            {
                "$limit": 10
            }
        ]

        cursor = async_queries.aggregate(pipeline)
        results = await cursor.to_list(length=None)

        most_used = [
            {"name": r["_id"], "count": r["count"]}
            for r in results if r["_id"]
        ]

        return {"most_used": most_used}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to fetch document usage: {str(e)}"}
        )


@router.get("/document-confidence")
async def get_document_confidence(_: dict = Depends(get_current_user)):
    """Documents with the lowest average confidence scores."""
    try:
        cursor = async_queries.find({}, {"retrieved_doc_title": 1, "confidence_score": 1})
        rows = await cursor.to_list(length=None)

        doc_stats: Dict[str, List[float]] = {}
        for r in rows:
            title = r.get("retrieved_doc_title")
            score = r.get("confidence_score")
            if title and score is not None:
                doc_stats.setdefault(title, []).append(float(score))

        low_confidence = []
        for name, scores in doc_stats.items():
            avg = sum(scores) / len(scores)
            low_confidence.append({"name": name, "avg_confidence": round(avg, 4), "query_count": len(scores)})

        low_confidence.sort(key=lambda x: x["avg_confidence"])

        return {
            "low_confidence": low_confidence[:10],
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to fetch document confidence: {str(e)}"}
        )
