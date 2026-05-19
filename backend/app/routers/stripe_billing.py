"""
Stripe billing router for Memora.

Endpoints:
  POST /create-checkout-session   — JWT required, owner/admin only
  POST /create-portal-session     — JWT required, owner/admin only
  POST /webhook                   — NO auth (Stripe signature verification)
  GET  /subscription-status       — JWT required, any approved member
"""

import os
import stripe
import time
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional

from app.services.clerk_auth import get_current_user
from app.services.database import _async_db
from app.config import get_settings

router = APIRouter()
settings = get_settings()

stripe.api_key = settings.stripe_secret_key

# Simple in-memory cache for Stripe Price Details to ensure high performance
_prices_cache = {}
CACHE_TTL = 300  # Cache for 5 minutes

async def get_stripe_price_details(price_id: str) -> dict:
    now = time.time()
    if price_id in _prices_cache:
        cached_val, expiry = _prices_cache[price_id]
        if now < expiry:
            return cached_val

    # Fetch from Stripe
    try:
        price = stripe.Price.retrieve(price_id)
        amount = price.unit_amount / 100
        currency = price.currency.upper()
        
        # Format price string
        if currency == "INR":
            price_str = f"₹{int(amount):,}"
        elif currency == "USD":
            price_str = f"${amount:,.2f}".replace(".00", "")
        else:
            price_str = f"{currency} {amount:,.2f}"
            
        details = {
            "amount": amount,
            "currency": currency,
            "price_str": price_str,
            "nickname": price.nickname or ""
        }
        _prices_cache[price_id] = (details, now + CACHE_TTL)
        return details
    except Exception as e:
        print(f"[Stripe] Error fetching price {price_id}: {str(e)}", flush=True)
        # Fallback defaults based on Price ID if Stripe API fails
        if price_id == settings.stripe_price_id_starter:
            return {"amount": 4999.0, "currency": "INR", "price_str": "₹4,999", "nickname": "Basic Plan"}
        elif price_id == settings.stripe_price_id_pro:
            return {"amount": 11999.0, "currency": "INR", "price_str": "₹11,999", "nickname": "Growth Plan"}
        elif price_id == settings.stripe_price_id_business:
            return {"amount": 24999.0, "currency": "INR", "price_str": "₹24,999", "nickname": "Business Plan"}
        return {"amount": 0.0, "currency": "USD", "price_str": "$0", "nickname": ""}

PLAN_LIMITS = {
    "trial":    {"max_documents": 10,    "max_members": 5,   "max_queries_per_month": 20},
    "starter":  {"max_documents": 10,    "max_members": 5,   "max_queries_per_month": 100},
    "pro":      {"max_documents": 100,   "max_members": 25,  "max_queries_per_month": 5000},
    "business": {"max_documents": 1000,  "max_members": 100, "max_queries_per_month": 50000},
}

PRICE_TO_PLAN = {
    settings.stripe_price_id_starter: "starter",
    settings.stripe_price_id_pro: "pro",
    settings.stripe_price_id_business: "business",
}


class CheckoutRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str


@router.post("/create-checkout-session")
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    """JWT required. Owner or admin creates a Stripe Checkout session for their org."""

    clerk_id = current_user["user_id"]
    org_id = str(current_user.get("org_id") or "").strip()

    if not org_id:
        raise HTTPException(status_code=403, detail="No organisation context found in token")

    # Verify caller is owner/admin
    caller = await _async_db.users.find_one(
        {"clerk_id": clerk_id, "org_id": org_id, "status": "approved"}
    )
    if not caller or caller.get("role") not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can manage billing")

    # Get or create Stripe customer
    sub_doc = await _async_db.subscriptions.find_one({"org_id": org_id})
    
    if sub_doc and sub_doc.get("stripe_customer_id"):
        customer_id = sub_doc["stripe_customer_id"]
    else:
        # Fetch org info for customer metadata
        org = await _async_db.org_settings.find_one({"org_id": org_id})
        try:
            customer = stripe.Customer.create(
                email=caller.get("email", ""),
                name=org.get("org_name", "") if org else "",
                metadata={"org_id": org_id, "clerk_id": clerk_id},
            )
            customer_id = customer.id
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Stripe Customer creation failed: {str(e)}")
        
        # Upsert subscription doc with customer ID
        await _async_db.subscriptions.update_one(
            {"org_id": org_id},
            {"$set": {
                "org_id": org_id,
                "stripe_customer_id": customer_id,
                "updated_at": datetime.utcnow().isoformat(),
            },
            "$setOnInsert": {"created_at": datetime.utcnow().isoformat()}},
            upsert=True,
        )

    # Create Checkout Session
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": body.price_id, "quantity": 1}],
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            metadata={"org_id": org_id},
            subscription_data={"metadata": {"org_id": org_id}},
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Checkout Session creation failed: {str(e)}")

    return {"checkout_url": session.url}


class PortalRequest(BaseModel):
    return_url: str


@router.post("/create-portal-session")
async def create_portal_session(
    body: PortalRequest,
    current_user: dict = Depends(get_current_user),
):
    """JWT required. Lets owner/admin manage their subscription in Stripe's portal."""

    clerk_id = current_user["user_id"]
    org_id = str(current_user.get("org_id") or "").strip()

    if not org_id:
        raise HTTPException(status_code=403, detail="No organisation context found in token")

    caller = await _async_db.users.find_one(
        {"clerk_id": clerk_id, "org_id": org_id, "status": "approved"}
    )
    if not caller or caller.get("role") not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can manage billing")

    sub_doc = await _async_db.subscriptions.find_one({"org_id": org_id})
    if not sub_doc or not sub_doc.get("stripe_customer_id"):
        raise HTTPException(status_code=404, detail="No billing account found for this organisation")

    try:
        session = stripe.billing_portal.Session.create(
            customer=sub_doc["stripe_customer_id"],
            return_url=body.return_url,
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Portal Session creation failed: {str(e)}")

    return {"portal_url": session.url}


@router.get("/subscription-status")
async def subscription_status(
    current_user: dict = Depends(get_current_user),
):
    """JWT required. Returns current subscription info, limits, and usage counts for the org."""

    org_id = str(current_user.get("org_id") or "").strip()
    if not org_id:
        raise HTTPException(status_code=403, detail="No organisation context found in token")

    sub_doc = await _async_db.subscriptions.find_one(
        {"org_id": org_id},
        {"_id": 0}
    )
    
    org_doc = await _async_db.org_settings.find_one(
        {"org_id": org_id},
        {
            "_id": 0,
            "plan": 1,
            "max_documents": 1,
            "max_members": 1,
            "max_queries_per_month": 1,
            "queries_used_this_month": 1,
            "org_name": 1,
            "org_slug": 1,
        }
    )

    if not org_doc:
        # Fallback default settings if org_settings document is missing
        org_doc = {
            "plan": "trial",
            "max_documents": 10,
            "max_members": 5,
            "max_queries_per_month": 20,
            "queries_used_this_month": 0,
            "org_name": "My Organisation",
            "org_slug": "my-organisation",
        }

    # Count actual usage dynamically
    docs_count = await _async_db.documents.count_documents({"org_id": org_id})
    members_count = await _async_db.users.count_documents({"org_id": org_id, "status": "approved"})

    # Dynamic pricing plans metadata
    starter_details = await get_stripe_price_details(settings.stripe_price_id_starter)
    pro_details = await get_stripe_price_details(settings.stripe_price_id_pro)
    business_details = await get_stripe_price_details(settings.stripe_price_id_business)

    plans = [
        {
            "id": "starter",  # Database mapping for basic tier
            "name": starter_details["nickname"] or "Basic Plan",
            "tagline": "Starter Base",
            "description": "Perfect for individuals and small teams starting their search journey",
            "price": starter_details["price_str"],
            "price_id": settings.stripe_price_id_starter,
            "features": [
                "Up to 10 vectors / documents base capacity",
                "Access for 5 concurrent team members",
                "100 queries per month neural lookup capacity",
                "Standard ingestion connectors",
            ],
        },
        {
            "id": "pro",
            "name": pro_details["nickname"] or "Growth Plan",
            "tagline": "Growth Base",
            "description": "Ideal for expanding companies needing rich collaborative brains",
            "price": pro_details["price_str"],
            "price_id": settings.stripe_price_id_pro,
            "features": [
                "Up to 100 vectors / documents base capacity",
                "Access for 25 concurrent team members",
                "5,000 queries per month neural lookup capacity",
                "Standard ingestion connectors & realtime updates",
                "Collaborative pipeline sharing",
            ],
        },
        {
            "id": "business",
            "name": business_details["nickname"] or "Business Plan",
            "tagline": "Enterprise Base",
            "description": "Perfect for heavy vector processing and maximum throughput",
            "price": business_details["price_str"],
            "price_id": settings.stripe_price_id_business,
            "features": [
                "Up to 1,000 vector documents base capacity",
                "Access for 100 concurrent team seats",
                "50,000 queries per month neural lookup capacity",
                "High performance priority vector lookup indexing",
                "Dedicated clusters with full tenant data isolation",
                "Advanced vector indexing customization",
            ],
        },
    ]

    return {
        "subscription": sub_doc,
        "limits": org_doc,
        "usage": {
            "documents": docs_count,
            "members": members_count,
            "queries": org_doc.get("queries_used_this_month", 0),
        },
        "plans": plans
    }


# ── Webhook handler ───────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    NO auth. Stripe sends events here directly.
    Signature is verified via STRIPE_WEBHOOK_SECRET.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data_object = event["data"]["object"]

    print(f"[Stripe Webhook] Received event: {event_type}", flush=True)

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data_object)

    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(data_object)

    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(data_object)

    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(data_object)

    return {"status": "ok"}


# ── Webhook Event Handlers ───────────────────────────────────────────────────

async def _handle_checkout_completed(session: dict):
    """First-time subscription creation after checkout."""
    org_id = session.get("metadata", {}).get("org_id")
    if not org_id:
        print("[Stripe] WARNING: checkout.session.completed without org_id in metadata", flush=True)
        return

    subscription_id = session.get("subscription")
    customer_id = session.get("customer")

    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        price_id = subscription["items"]["data"][0]["price"]["id"]
        plan = PRICE_TO_PLAN.get(price_id, "pro")
        status = subscription["status"]
        current_period_start = datetime.fromtimestamp(subscription["current_period_start"]).isoformat()
        current_period_end = datetime.fromtimestamp(subscription["current_period_end"]).isoformat()
        cancel_at_period_end = subscription.get("cancel_at_period_end", False)
    except Exception as e:
        print(f"[Stripe] Error fetching subscription details: {str(e)}", flush=True)
        return

    now = datetime.utcnow().isoformat()

    # Update subscriptions collection
    await _async_db.subscriptions.update_one(
        {"org_id": org_id},
        {"$set": {
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "plan": plan,
            "status": status,
            "price_id": price_id,
            "current_period_start": current_period_start,
            "current_period_end": current_period_end,
            "cancel_at_period_end": cancel_at_period_end,
            "updated_at": now,
        },
        "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    # Update org_settings with new plan limits
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["pro"])
    await _async_db.org_settings.update_one(
        {"org_id": org_id},
        {"$set": {
            "plan": plan,
            **limits,
            "updated_at": datetime.utcnow(),
        }},
    )

    print(f"[Stripe] ✅ Org {org_id} upgraded to '{plan}'", flush=True)


async def _handle_subscription_updated(subscription: dict):
    """Plan change, renewal, or cancellation scheduled."""
    org_id = subscription.get("metadata", {}).get("org_id")
    if not org_id:
        # Fallback: look up by stripe_subscription_id
        sub_doc = await _async_db.subscriptions.find_one(
            {"stripe_subscription_id": subscription["id"]}
        )
        org_id = sub_doc["org_id"] if sub_doc else None

    if not org_id:
        print(f"[Stripe] WARNING: subscription.updated — can't resolve org_id for {subscription['id']}", flush=True)
        return

    price_id = subscription["items"]["data"][0]["price"]["id"]
    plan = PRICE_TO_PLAN.get(price_id, "pro")
    status = subscription["status"]

    await _async_db.subscriptions.update_one(
        {"org_id": org_id},
        {"$set": {
            "plan": plan,
            "status": status,
            "price_id": price_id,
            "current_period_start": datetime.fromtimestamp(subscription["current_period_start"]).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription["current_period_end"]).isoformat(),
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
            "updated_at": datetime.utcnow().isoformat(),
        }},
    )

    # Update org_settings limits based on new plan (only if active)
    if status in ("active", "trialing"):
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["pro"])
        await _async_db.org_settings.update_one(
            {"org_id": org_id},
            {"$set": {"plan": plan, **limits, "updated_at": datetime.utcnow()}},
        )

    print(f"[Stripe] Subscription updated: org={org_id} plan={plan} status={status}", flush=True)


async def _handle_subscription_deleted(subscription: dict):
    """Subscription canceled — revert to trial."""
    org_id = subscription.get("metadata", {}).get("org_id")
    if not org_id:
        sub_doc = await _async_db.subscriptions.find_one(
            {"stripe_subscription_id": subscription["id"]}
        )
        org_id = sub_doc["org_id"] if sub_doc else None

    if not org_id:
        return

    await _async_db.subscriptions.update_one(
        {"org_id": org_id},
        {"$set": {
            "status": "canceled",
            "plan": "trial",
            "updated_at": datetime.utcnow().isoformat(),
        }},
    )

    # Revert org limits to trial
    limits = PLAN_LIMITS["trial"]
    await _async_db.org_settings.update_one(
        {"org_id": org_id},
        {"$set": {"plan": "trial", **limits, "updated_at": datetime.utcnow()}},
    )

    print(f"[Stripe] ⚠️ Subscription canceled: org={org_id} — reverted to trial", flush=True)


async def _handle_payment_failed(invoice: dict):
    """Payment failed — mark subscription as past_due."""
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return

    sub_doc = await _async_db.subscriptions.find_one(
        {"stripe_subscription_id": subscription_id}
    )
    if not sub_doc:
        return

    await _async_db.subscriptions.update_one(
        {"org_id": sub_doc["org_id"]},
        {"$set": {"status": "past_due", "updated_at": datetime.utcnow().isoformat()}},
    )

    print(f"[Stripe] ⚠️ Payment failed for org={sub_doc['org_id']}", flush=True)
