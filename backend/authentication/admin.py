from django.contrib import admin
from authentication.models import SecurityEvent


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "event", "severity", "message", "created_at")
    list_filter = ("severity", "event")
    search_fields = ("event", "message")
    ordering = ("-created_at",)
    
    # disable add / delete / change buttons in admin
    def has_add_permission(self, request):
        return False  # never allow add

    def has_change_permission(self, request, obj=None):
        return False  # never allow editing

    def has_delete_permission(self, request, obj=None):
        return False  # never allow deletion