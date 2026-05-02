from authentication.models import SecurityEvent


def log_security_event(
    user=None, event=None, severity="INFO", ip_address=None,
    user_agent=None, message=None
):
    """
    Append a new security event.
    """
    SecurityEvent.objects.create(
        user=user,
        event=event,
        severity=severity,
        ip_address=ip_address,
        user_agent=user_agent or "",
        message=message or ""
    )
    

def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def build_update_audit_message(instance, validated_data, *, sensitive_fields=None):
    """
    Compares model instance values with incoming validated data
    and returns a human-readable audit message.
    Only logs password if it actually changed.
    """
    sensitive_fields = set(sensitive_fields or [])
    changes = []

    for field, new_value in validated_data.items():
        if not hasattr(instance, field):
            continue

        old_value = getattr(instance, field)

        # Special handling for password
        if field == "password":
            if not new_value:  # empty password = not changing
                continue
            if instance.check_password(new_value):  # password is same as before
                continue
            old_value = "***"
            new_value = "***"

        # Skip if value didn’t change (except password already handled)
        elif old_value == new_value:
            continue

        # Mask sensitive fields
        if field in sensitive_fields:
            old_value = "***"
            new_value = "***"

        changes.append(f"{field} changed from '{old_value}' to '{new_value}'")

    return "\n".join(changes) if changes else None


def build_access_policy_audit_message(instance, validated_data):
    """
    Audit message for AccessPolicy updates.
    Handles ManyToManyField 'areas' properly.
    """
    changes = []

    for field, new_value in validated_data.items():
        if not hasattr(instance, field):
            continue

        old_value = getattr(instance, field)

        # Handle ManyToManyField (like areas)
        if field == "areas":
            old_ids = set(old_value.values_list("id", flat=True))
            new_ids = set([area.id if hasattr(area, "id") else area for area in new_value])
            if old_ids == new_ids:
                continue
            old_names = [str(area) for area in old_value.all()]
            new_names = [str(area) for area in new_value]
            changes.append(f"{field} changed from {old_names} to {new_names}")
            continue

        # Skip if value didn’t change
        elif old_value == new_value:
            continue

        changes.append(f"{field} changed from '{old_value}' to '{new_value}'")

    return "\n".join(changes) if changes else None