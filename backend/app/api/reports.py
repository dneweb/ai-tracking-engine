from fastapi import APIRouter, Query, BackgroundTasks, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from app.services.ai_service import structured_chat_completion
from app.services.clerk_auth import require_permission
from datetime import datetime, timedelta, timezone, date
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from xml.sax.saxutils import escape as _xml_escape
import os
import re
from collections import Counter
from io import BytesIO
from dotenv import load_dotenv
from html import escape as _html_escape
from urllib.parse import quote as _url_quote

import json
from app.middleware.tenant import get_current_org_id

router = APIRouter(prefix="/api/reports", tags=["reports"])

def _calculate_urgency(question_count: int, avg_confidence: float, avg_age_days: float) -> float:
    frequency_score = min(question_count / 5.0, 1.0) * 100
    severity_score = (1.0 - avg_confidence) * 100

    if avg_age_days <= 3:
        recency_score = 100.0
    elif avg_age_days <= 7:
        recency_score = 75.0
    elif avg_age_days <= 14:
        recency_score = 50.0
    else:
        recency_score = 25.0

    return round(
        (frequency_score * 0.4) + (severity_score * 0.4) + (recency_score * 0.2),
        1,
    )


def _urgency_to_priority(urgency: float) -> str:
    if urgency >= 60:
        return "high"
    elif urgency >= 40:
        return "medium"
    return "low"


def _generate_recommendation(
    topic: str, avg_conf: float, count: int, docs: List[str]
) -> str:
    parts = []
    if avg_conf < 0.3:
        parts.append(
            f"The topic '{topic}' has very low confidence ({avg_conf:.0%}). "
            "Consider creating a dedicated SOP or FAQ section for this topic."
        )
    elif avg_conf < 0.45:
        parts.append(
            f"Users are asking about '{topic}' but getting mediocre answers ({avg_conf:.0%} confidence). "
            "Expand the existing documentation with more detailed instructions."
        )
    else:
        parts.append(
            f"The topic '{topic}' could benefit from minor improvements ({avg_conf:.0%} confidence)."
        )

    if count >= 5:
        parts.append(f"This topic has {count} questions — it's a recurring pain point.")
    elif count >= 3:
        parts.append(f"Multiple users ({count}) have asked about this — a pattern is forming.")

    if docs:
        parts.append(f"Review and update: {', '.join(docs)}.")
    else:
        parts.append("No related documents found — consider creating new documentation.")

    return " ".join(parts)


def _cluster_questions(
    queries: List[Dict[str, Any]], min_cluster_size: int
) -> List[Dict[str, Any]]:
    # Guard against undefined or empty queries early
    if queries is None:
        print("⚠️ Warning: _cluster_questions received None. Defaulting to empty list.")
        return []
    
    if not queries:
        return []

    tokenized = []
    for q in queries:
        tokens = set(_tokenize(q.get("question", "")))
        tokenized.append(tokens)

    n = len(queries)
    assigned = [False] * n
    clusters: List[List[int]] = []

    for i in range(n):
        if assigned[i]:
            continue
        cluster = [i]
        assigned[i] = True
        for j in range(i + 1, n):
            if assigned[j]:
                continue
            # Similarity threshold 0.15
            cluster_tokens = set()
            for idx in cluster:
                cluster_tokens |= tokenized[idx]
            overlap = cluster_tokens & tokenized[j]
            union = cluster_tokens | tokenized[j]
            if union and len(overlap) / len(union) >= 0.15:
                cluster.append(j)
                assigned[j] = True
        clusters.append(cluster)

    result = []
    cluster_id = 0
    for member_indices in clusters:
        if len(member_indices) < min_cluster_size:
            continue

        member_queries = [queries[i] for i in member_indices]

        all_tokens: List[str] = []
        for idx in member_indices:
            all_tokens.extend(tokenized[idx])

        token_counts = Counter(all_tokens)
        top_tokens = [t for t, _ in token_counts.most_common(4)]

        # Deduplicate sample questions
        seen = set()
        unique_samples = []
        for q in member_queries:
            question_text = q.get("question", "").strip()
            question_lower = question_text.lower()
            if question_lower and question_lower not in seen:
                seen.add(question_lower)
                unique_samples.append(question_text)
            if len(unique_samples) == 5:
                break

        topic = _build_topic_name(top_tokens, unique_samples)

        avg_conf = sum(
            q.get("confidence_score", 0) or 0 for q in member_queries
        ) / len(member_queries)

        avg_age = _calculate_avg_age_days(member_queries)
        urgency = _calculate_urgency(len(member_queries), avg_conf, avg_age)
        priority = _urgency_to_priority(urgency)

        related_docs = list({
            doc_title
            for q in member_queries
            for doc_title in [q.get("retrieved_doc_title")]
            if doc_title and isinstance(doc_title, str) and doc_title.strip()
        })

        recommendation = _generate_recommendation(topic, avg_conf, len(member_queries), related_docs)

        result.append({
            "cluster_id": cluster_id,
            "priority": priority,
            "topic": topic,
            "question_count": len(member_queries),
            "avg_confidence": round(avg_conf, 4),
            "urgency_score": urgency,
            "sample_questions": unique_samples,
            "related_documents": related_docs,
            "recommendation": recommendation,
        })
        cluster_id += 1

    result.sort(key=lambda c: c["urgency_score"], reverse=True)
    return result


def _build_topic_name(top_tokens: List[str], sample_questions: List[str]) -> str:
    if sample_questions:
        shortest = min(sample_questions, key=len)
        clean = shortest.strip().rstrip("?").strip()
        if len(clean) <= 50:
            return clean
        return clean[:47] + "..."

    if top_tokens:
        return " ".join(top_tokens).title()

    return "Miscellaneous"


@router.post("/analyze-topic")
async def analyze_topic(
    payload: Dict[str, Any],
    org_id: str = Depends(get_current_org_id),
    _: dict = Depends(require_permission("reports:read")),
):
    """
    Generate deep AI insights for a specific topic cluster.
    Used by the frontend when a user expands a cluster card.
    """
    try:
        # Health check guard
        if not await _check_mistral_health():
            return JSONResponse(
                status_code=503,
                content={"status": "error", "message": "AI Service (Mistral/Groq) is currently unavailable."}
            )

        topic = payload.get("topic", "Unknown Topic")
        samples = payload.get("samples", [])
        question_count = payload.get("question_count", 0)
        docs = payload.get("related_documents", [])

        system_prompt = (
            "You are a Senior Documentation Analyst. Analyze the following topic cluster of user questions "
            "and provide a structured JSON response with failure analysis, knowledge gap insights, "
            "and a specific SOP recommendation."
        )
        
        user_prompt = f"""
        Topic: {topic}
        Number of Questions: {question_count}
        Sample Questions: {json.dumps(samples)}
        Current Documents: {json.dumps(docs)}
        
        Return JSON with:
        {{
            "analysis": {{
                "failure_analysis": {{
                    "missing_sop": 0-100,
                    "ambiguous_documentation": 0-100,
                    "wrong_document_retrieved": 0-100,
                    "outdated_information": 0-100,
                    "query_intent_misinterpretation": 0-100
                }},
                "knowledge_gap_insights": {{
                    "what_employees_want_to_know": "...",
                    "why_current_sop_fails": "...",
                    "missing_information": "..."
                }},
                "sop_recommendation": {{
                    "problem": "...",
                    "action": "...",
                    "confidence": 0.0-1.0
                }},
                "auto_sop_rewrite": "..."
            }}
        }}
        """
        
        analysis = await structured_chat_completion(system_prompt, user_prompt)
        
        if "error" in analysis:
            raise Exception(analysis["error"])
            
        return analysis
        
    except Exception as e:
        print(f"❌ Topic analysis failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Analysis Pipeline Failed: {str(e)}"}
        )


async def _check_mistral_health() -> bool:
    """Check if Mistral or Groq API is reachable."""
    try:
        import httpx
        from app.config import get_settings
        settings = get_settings()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.mistral.ai/v1/models",
                headers={"Authorization": f"Bearer {settings.mistral_api_key}"},
                timeout=5.0,
            )
            if response.status_code == 200:
                return True
    except Exception as e:
        print(f"Mistral health check failed: {e}")
    try:
        import httpx
        from app.config import get_settings
        settings = get_settings()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                timeout=5.0,
            )
            return response.status_code == 200
    except Exception as e:
        print(f"⚠️ AI Service Health Check Failed: {e}")
        return False


def _calculate_avg_age_days(member_queries: List[Dict[str, Any]]) -> float:
    now = datetime.now(timezone.utc)
    ages = []
    for q in member_queries:
        raw_ts = q.get("created_at", "")
        if not raw_ts:
            continue
        try:
            # Handle Z or offset-naive/aware conversion safely
            if isinstance(raw_ts, str):
                raw_ts = raw_ts.replace("Z", "+00:00")
                dt = datetime.fromisoformat(raw_ts)
            else:
                dt = raw_ts
                
            # Ensure dt is aware
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
                
            ages.append((now - dt).total_seconds() / 86400)
        except (ValueError, AttributeError) as e:
            print(f"Error parsing date {raw_ts}: {e}")
            continue
    return sum(ages) / len(ages) if ages else 30.0


def _tokenize(text: str) -> List[str]:
    if not isinstance(text, str):
        return []
    return [t for t in re.split(r'\W+', text.lower()) if len(t) > 2]


async def _fetch_total_queries_in_range(start_date: date, end_date: date, org_id: str) -> int:
    """Count total queries in date range, strictly scoped to org. org_id is REQUIRED."""
    from app.services.database import async_queries, _require_org_id
    _require_org_id(org_id, "_fetch_total_queries_in_range")
    query = {
        "org_id": org_id,
        "created_at": {
            "$gte": start_date.isoformat(),
            "$lte": (end_date + timedelta(days=1)).isoformat()
        }
    }
    return await async_queries.count_documents(query)


async def _fetch_low_confidence_queries(start_date: date, end_date: date, threshold: float, org_id: str) -> List[Dict[str, Any]]:
    """Fetch low-confidence queries in date range, strictly scoped to org. org_id is REQUIRED."""
    from app.services.database import async_queries, _require_org_id
    _require_org_id(org_id, "_fetch_low_confidence_queries")
    query = {
        "org_id": org_id,
        "created_at": {
            "$gte": start_date.isoformat(),
            "$lte": (end_date + timedelta(days=1)).isoformat()
        },
        "$or": [
            {"confidence_score": {"$lt": threshold}},
            {"confidence": {"$lt": threshold}}
        ]
    }
    cursor = async_queries.find(query)
    return await cursor.to_list(length=None)


@router.get("/sop-updates")
async def get_sop_updates(
    background_tasks: BackgroundTasks,
    days: int = Query(default=30, ge=1, le=365),
    confidence_threshold: float = Query(default=0.6, ge=0.0, le=1.0),
    min_cluster_size: int = Query(default=2, ge=1, le=50),
    org_id: str = Depends(get_current_org_id),
    _: dict = Depends(require_permission("reports:read")),
):
    try:
        # Health check guard
        if not await _check_mistral_health():
             background_tasks.add_task(print, "⚠️ Warning: Report requested but AI Service is offline.")
             # We can still cluster, but AI recommendations might be generic or fail later

        today = datetime.now(timezone.utc).date()
        start_date = today - timedelta(days=days)

        print(f"🔍 Report params: days={days}, threshold={confidence_threshold}, min_cluster={min_cluster_size}")
        print(f"🔍 Date range: {start_date} → {today}")

        total_in_period = await _fetch_total_queries_in_range(start_date, today, org_id=org_id)
        queries = await _fetch_low_confidence_queries(start_date, today, confidence_threshold, org_id=org_id)

        # 🛡️ Guard: Validate intermediate variables
        if queries is None:
            raise ValueError("Data pipeline failure: Could not retrieve queries from database.")

        print(f"🔍 Clustering {len(queries)} questions with min_cluster_size={min_cluster_size}")
        clusters = _cluster_questions(queries, min_cluster_size)
        print(f"🔍 Produced {len(clusters)} clusters")
        for c in clusters:
            print(
                f"   📦 [{c['priority'].upper()}] {c['topic']} "
                f"— {c['question_count']} questions, urgency={c['urgency_score']}/100"
            )

        # Filter resolved topics — SCOPED TO org_id (was leaking cross-tenant data)
        try:
            from app.services.database import resolved_topics_collection

            resolved = list(resolved_topics_collection.find({
                "org_id":      org_id,          # ← CRITICAL: scope to this org only
                "resolved_at": {
                    "$gte": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
                },
            }, {"topic_name": 1}))
            resolved_names = {r["topic_name"].lower() for r in resolved}
            clusters = [c for c in clusters if c["topic"].lower() not in resolved_names]
        except Exception as _resolved_err:
            print(f"[reports] Resolved topic filtering failed (continuing): {_resolved_err}")



        high_count = sum(1 for c in clusters if c["priority"] == "high")
        medium_count = sum(1 for c in clusters if c["priority"] == "medium")
        low_count = sum(1 for c in clusters if c["priority"] == "low")

        period_label = f"Last {days} day{'s' if days != 1 else ''}"

        return {
            "status": "success",
            "report_date": today.isoformat(),
            "period": period_label,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "filters_used": {
                "days": days,
                "confidence_threshold": confidence_threshold,
                "min_cluster_size": min_cluster_size,
            },
            "summary": {
                "total_queries_in_period": total_in_period,
                "total_low_confidence": len(queries),
                "clusters_identified": len(clusters),
                "high_priority_count": high_count,
                "medium_priority_count": medium_count,
                "low_priority_count": low_count,
            },
            "clusters": clusters,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to generate report: {str(e)}"},
        )


@router.get("/sop-updates/export-pdf")
async def export_sop_updates_pdf(
    days: int = Query(default=30, ge=1, le=365),
    confidence_threshold: float = Query(default=0.6, ge=0.0, le=1.0),
    min_cluster_size: int = Query(default=2, ge=1, le=50),
    org_id: str = Depends(get_current_org_id),
    _: dict = Depends(require_permission("reports:read")),
):
    try:
        today = datetime.now(timezone.utc).date()
        start_date = today - timedelta(days=days)

        total_in_period = await _fetch_total_queries_in_range(start_date, today, org_id=org_id)
        queries = await _fetch_low_confidence_queries(start_date, today, confidence_threshold, org_id=org_id)
        
        # 🛡️ Guard: Validate intermediate variables
        if queries is None:
             raise ValueError("Data pipeline failure: Could not retrieve queries for PDF export.")

        clusters = _cluster_questions(queries, min_cluster_size)

        high_count = sum(1 for c in clusters if c["priority"] == "high")
        medium_count = sum(1 for c in clusters if c["priority"] == "medium")
        low_count = sum(1 for c in clusters if c["priority"] == "low")

        generated_at = datetime.now(timezone.utc).isoformat()

        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(
            pdf_buffer,
            pagesize=letter,
            title="SOP Updates Needed — Report",
        )

        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph("SOP Updates Needed — Report", styles["Title"]))
        story.append(Spacer(1, 10))

        filters_text = (
            f"<b>Generated:</b> {_xml_escape(generated_at)}<br/>"
            f"<b>Days:</b> {days} &nbsp;&nbsp; "
            f"<b>Confidence &lt;</b> {confidence_threshold} &nbsp;&nbsp; "
            f"<b>Min cluster size:</b> {min_cluster_size}"
        )
        story.append(Paragraph(filters_text, styles["Normal"]))
        story.append(Spacer(1, 12))

        summary_rows = [
            ["Total queries (period)", str(total_in_period)],
            ["Low confidence queries", str(len(queries))],
            ["Topics found", str(len(clusters))],
            ["High priority", str(high_count)],
            ["Medium priority", str(medium_count)],
            ["Low priority", str(low_count)],
        ]

        summary_table = Table([["Summary", "Value"]] + summary_rows, colWidths=[220, 280])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F9FAFB")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(summary_table)
        story.append(Spacer(1, 16))

        for idx, c in enumerate(clusters, start=1):
            topic = _xml_escape(str(c.get("topic", "")))
            priority = _xml_escape(str(c.get("priority", ""))).upper()
            question_count = c.get("question_count", 0)
            avg_confidence = c.get("avg_confidence", 0.0)
            urgency_score = c.get("urgency_score", 0.0)
            related_docs = c.get("related_documents") or []
            recommendation = _xml_escape(str(c.get("recommendation", "")))

            story.append(Paragraph(f"{idx}. {topic}", styles["Heading2"]))
            meta = (
                f"<b>Priority:</b> {priority} &nbsp;&nbsp; "
                f"<b>Questions:</b> {question_count} &nbsp;&nbsp; "
                f"<b>Avg confidence:</b> {avg_confidence} &nbsp;&nbsp; "
                f"<b>Urgency:</b> {urgency_score}/100"
            )
            story.append(Paragraph(meta, styles["Normal"]))
            story.append(Spacer(1, 6))

            samples = c.get("sample_questions") or []
            if samples:
                sample_lines = "<br/>".join(f"• {_xml_escape(str(s))}" for s in samples)
            else:
                sample_lines = "None"
            story.append(Paragraph(f"<b>Sample questions:</b><br/>{sample_lines}", styles["Normal"]))
            story.append(Spacer(1, 6))

            docs_text = ", ".join(_xml_escape(str(d)) for d in related_docs) if related_docs else "None"
            story.append(Paragraph(f"<b>Related documents:</b> {docs_text}", styles["Normal"]))
            story.append(Spacer(1, 6))

            story.append(Paragraph(f"<b>Recommendation:</b> {recommendation}", styles["Normal"]))
            story.append(Spacer(1, 14))

        doc.build(story)
        pdf_buffer.seek(0)

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=sop-report.pdf"},
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Failed to export PDF report: {str(e)}"},
        )

