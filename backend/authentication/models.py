from django.db import models
from users.models import User


class SecurityEvent(models.Model):
    class EventType(models.TextChoices):
        # --- Authentication ---
        LOGIN_SUCCESS = "LOGIN_SUCCESS"
        LOGIN_REQUESTED = "LOGIN_REQUESTED"
        LOGIN_FAILED = "LOGIN_FAILED"
        PROFILE_UPDATED = "PROFILE_UPDATED"
        USER_LOGOUT = "USER_LOGOUT"

        # --- Tokens ---
        TOKEN_REFRESHED = "TOKEN_REFRESHED"
        TOKEN_BLACKLISTED = "TOKEN_BLACKLISTED"

        # --- Credentials ---
        PASSWORD_CHANGED = "PASSWORD_CHANGED"

        # --- Account lifecycle ---
        ACCOUNT_CREATED = "ACCOUNT_CREATED"
        ACCOUNT_ACTIVATED = "ACCOUNT_ACTIVATED"
        ACCOUNT_DEACTIVATED = "ACCOUNT_DEACTIVATED"

        # --- Admin actions ---
        MANAGER_ACTION = "MANAGER_ACTION"

    class Severity(models.TextChoices):
        INFO = "INFO"
        WARNING = "WARNING"
        CRITICAL = "CRITICAL"

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="security_events"
    )

    event = models.CharField(
        max_length=64,
        choices=EventType.choices,
        db_index=True
    )

    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        default=Severity.INFO,
        db_index=True
    )

    message = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = "security_event"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        """Disable editing after creation."""
        if self.pk:
            # prevent updates
            raise ValueError("SecurityEvent is append-only and cannot be updated.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Disable deletion."""
        raise ValueError("SecurityEvent is append-only and cannot be deleted.")

    def __str__(self):
        return f"{self.event} | {self.user} | {self.created_at}"


