"""
Analytics API router.

Role-Based Access Control:
  - All analytics endpoints → viewer, member, admin, owner (read-only)
  - /timeline and /low-confidence additionally require admin | owner

Multi-Tenant Isolation:
  - Every query is scoped by org_id from TenantMiddleware.
  - NO query runs without an org_id — cross-tenant leaks are impossible.

FIXED:
  - get_document_usage:      was missing org_id filter (CRITICAL LEAK — fixed)
  - get_document_confidence: was missing org_id filter (CRITICAL LEAK — fixed)
"""

from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from app.services.clerk_auth import (
    get_current_user,
    get_admin_user,
    require_permission,
)
from app.services.database import async_queries, async_documents
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any
from app.middleware.tenant import get_current_org_id

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ── Shared helpers ────────────────────────────────────────────────────────────

async def _fetch_queries_in_range(
    start_date: date,
    end_date: date,
    org_id: str,        # REQUIRED
) -> List[Dict[str, Any]]:
    """Fetch queries within [start_date, end_date) strictly scoped to org."""
    start_iso = start_date.isoformat() + "T00:00:00"
    end_iso   = end_date.isoformat()   + "T00:00:00"

    filt = {
        "org_id":     org_id,   # ← always required
        "created_at": {"$gte": start_iso, "$lt": end_iso},
    }
    cursor  = async_queries.find(filt, {"created_at": 1})
    return await cursor.to_list(length=None)


def _group_by_date(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for row in rows:
        raw_ts = row.get("created_at", "")
        if not raw_ts:
            continue
        try:
            dt      = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
            day_str = dt.date().isoformat()
            counts[day_str] = counts.get(day_str, 0) + 1
        except (ValueError, AttributeError):
            continue
    return counts


def _build_full_timeline(
    counts: Dict[str, int], start_date: date, num_days: int
) -> List[Dict]:
    return [
        {"date": (start_date + timedelta(days=i)).isoformat(),
         "count": counts.get((start_date + timedelta(days=i)).isoformat(), 0)}
        for i in range(num_days)
    ]


def _calculate_trend(current: int, previous: int) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


# ── GET /api/analytics/timeline  (admin | owner) ─────────────────────────────
@router.get("/timeline")
async def get_timeline(
    days: int   = Query(default=30, ge=1, le=365),
    org_id: str = Depends(get_current_org_id),
    _: dict     = Depends(require_permission("analytics:read")),
):
    """
    Query timeline for current period vs previous period.
    Scoped strictly to the authenticated organisation.
    """
    try:
        today         = datetime.now(timezone.utc).date()
        current_start = today - timedelta(days=days)
        previous_start = today - timedelta(days=days * 2)

        current_rows  = await _fetch_queries_in_range(current_start, today, org_id=org_id)
        current_counts = _group_by_date(current_rows)
        current_timeline = _build_full_timeline(current_counts, current_start, days)
        current_total = sum(e["count"] for e in current_timeline)

        previous_rows = await _fetch_queries_in_range(previous_start, current_start, org_id=org_id)
        previous_total = sum(_group_by_date(previous_rows).values())

        return {
            "timeline":           current_timeline,
            "total_period":       current_total,
            "trend_vs_previous":  _calculate_trend(current_total, previous_total),
        }
    except Exception as e:
        import traceback; traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Timeline error: {str(e)}"},
        )


# ── GET /api/analytics/stats  (viewer+) ──────────────────────────────────────
@router.get("/stats")
async def get_stats(
    days: int   = Query(default=30, ge=1, le=365),
    org_id: str = Depends(get_current_org_id),
    _: dict     = Depends(require_permission("analytics:read")),
):
    """Overall query count stats for the authenticated org."""
    try:
        today          = datetime.now(timezone.utc).date()
        current_start  = today - timedelta(days=days)
        previous_start = today - timedelta(days=days * 2)

        curr_start_iso = current_start.isoformat() + "T00:00:00"
        prev_start_iso = previous_start.isoformat() + "T00:00:00"
        today_iso      = today.isoformat() + "T23:59:59"

        curr_filt = {
            "org_id":     org_id,
            "created_at": {"$gte": curr_start_iso, "$lt": today_iso},
        }
        prev_filt = {
            "org_id":     org_id,
            "created_at": {"$gte": prev_start_iso, "$lt": curr_start_iso},
        }

        current_count  = await async_queries.count_documents(curr_filt)
        previous_count = await async_queries.count_documents(prev_filt)
        trend = (
            ((current_count - previous_count) / previous_count * 100)
            if previous_count > 0 else 0
        )

        return {
            "current_count":  current_count,
            "previous_count": previous_count,
            "trend":          trend,
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Failed to fetch stats"},
        )


# ── GET /api/analytics/low-confidence  (admin | owner) ───────────────────────
@router.get("/low-confidence")
async def get_low_confidence(
    limit:      int   = Query(default=10,  ge=1,   le=100),
    threshold:  float = Query(default=0.6, ge=0.0, le=1.0),
    offset:     int   = Query(default=0,   ge=0),
    sort_by:    str   = Query(default="confidence", regex="^(confidence|date)$"),
    sort_order: str   = Query(default="asc",        regex="^(asc|desc)$"),
    org_id: str       = Depends(get_current_org_id),
    _: dict           = Depends(require_permission("analytics:read")),
):
    """Low-confidence queries for the authenticated org (admin/owner only)."""
    try:
        order_col = "confidence_score" if sort_by == "confidence" else "created_at"
        sort_dir  = 1 if sort_order == "asc" else -1

        filt = {
            "org_id":           org_id,
            "confidence_score": {"$lt": threshold},
        }
        cursor = async_queries.find(
            filt,
            {
                "_id": 1, "question": 1, "answer": 1,
                "confidence_score": 1, "retrieved_doc_title": 1,
                "category": 1, "created_at": 1,
            }
        ).sort(order_col, sort_dir).skip(offset).limit(limit)

        raw_rows = await cursor.to_list(length=None)
        rows = []
        for r in raw_rows:
            r["id"] = str(r.pop("_id", ""))
            rows.append(r)

        total = await async_queries.count_documents(filt)
        return {"queries": rows, "total": total, "limit": limit, "offset": offset}

    except Exception as e:
        import traceback; traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to fetch low-confidence queries: {str(e)}"},
        )


# ── GET /api/analytics/document-usage  (viewer+) — FIXED CRITICAL LEAK ───────
@router.get("/document-usage")
async def get_document_usage(
    org_id: str = Depends(get_current_org_id),
    _: dict     = Depends(require_permission("analytics:read")),
):
    """
    Most-used documents by retrieval count, scoped to the authenticated org.

    PREVIOUSLY BROKEN: this endpoint had no org_id filter, leaking cross-tenant data.
    FIXED: all aggregation stages now begin with a $match on org_id.
    """
    try:
        pipeline = [
            # ① Isolate to this org — CRITICAL, was missing before
            {"$match": {"org_id": org_id}},
            {"$group":  {"_id": "$retrieved_doc_title", "count": {"$sum": 1}}},
            {"$sort":   {"count": -1}},
            {"$limit":  10},
        ]
        cursor  = async_queries.aggregate(pipeline)
        results = await cursor.to_list(length=None)
        most_used = [
            {"name": r["_id"], "count": r["count"]}
            for r in results if r["_id"]
        ]
        return {"most_used": most_used}

    except Exception as e:
        import traceback; traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to fetch document usage: {str(e)}"},
        )


# ── GET /api/analytics/document-confidence  (viewer+) — FIXED CRITICAL LEAK ──
@router.get("/document-confidence")
async def get_document_confidence(
    org_id: str = Depends(get_current_org_id),
    _: dict     = Depends(require_permission("analytics:read")),
):
    """
    Documents with lowest average confidence scores, scoped to the authenticated org.

    PREVIOUSLY BROKEN: this endpoint fetched ALL queries with no org_id filter.
    FIXED: queries are now filtered by org_id before aggregation.
    """
    try:
        # Filter by org_id — was missing, causing cross-tenant data exposure
        cursor = async_queries.find(
            {"org_id": org_id},
            {"retrieved_doc_title": 1, "confidence_score": 1},
        )
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
            low_confidence.append({
                "name":           name,
                "avg_confidence": round(avg, 4),
                "query_count":    len(scores),
            })

        low_confidence.sort(key=lambda x: x["avg_confidence"])
        return {"low_confidence": low_confidence[:10]}

    except Exception as e:
        import traceback; traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to fetch document confidence: {str(e)}"},
        )
