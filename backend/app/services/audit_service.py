"""
Audit logging service for org role changes.
Logs all member role changes to the org_role_audit collection.
"""
from datetime import datetime
from typing import Optional
from app.services.database import _async_db


async def log_role_change(
    org_id: str,
    changed_by_user_id: str,
    changed_by_role: str,
    target_user_id: str,
    from_role: str,
    to_role: str,
    action: str,  # invited | promoted | demoted | removed | transferred_ownership
    reason: Optional[str] = None
) -> bool:
    """
    Log a role change to the org_role_audit collection.
    
    Args:
        org_id: Organization ID
        changed_by_user_id: User ID who made the change
        changed_by_role: Role of the user who made the change
        target_user_id: User ID whose role was changed
        from_role: Previous role
        to_role: New role
        action: Type of action performed
        reason: Optional reason for the change
    
    Returns:
        True if successful, False otherwise
    """
    try:
        org_role_audit = _async_db["org_role_audit"]
        
        audit_log = {
            "org_id": org_id,
            "changed_by_user_id": changed_by_user_id,
            "changed_by_role": changed_by_role,
            "target_user_id": target_user_id,
            "from_role": from_role,
            "to_role": to_role,
            "action": action,
            "timestamp": datetime.utcnow(),
            "reason": reason,
        }
        
        result = await org_role_audit.insert_one(audit_log)
        
        if result.inserted_id:
            print(f"✅ Audit log created: {action} for {target_user_id} in org {org_id}")
            return True
        else:
            print(f"❌ Failed to create audit log for {target_user_id}")
            return False
            
    except Exception as e:
        print(f"❌ Error logging role change: {e}")
        return False
