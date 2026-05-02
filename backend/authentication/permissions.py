from rest_framework.permissions import BasePermission
from users.models import User
        
        
class IsAdmin(BasePermission):
    # for only the admin endpoints
    def has_permission(self, request, view):
        return (
            request.user.is_active
            and request.user.role == User.Role.ADMIN
        )
      
        
class IsManager(BasePermission):
    # for only high security manger endpoints
    def has_permission(self, request, view):
        return (
            request.user.is_active
            and request.user.role == User.Role.MANAGER
        )
      
        
class IsSuper(BasePermission):
    # for only high security Super endpoints
    def has_permission(self, request, view):
        return (
            request.user.is_active
            and request.user.role == User.Role.SUPER
        )
      
        
class IsSuperOrManagerOrAdmin(BasePermission):
    # for only high security manger endpoints
    def has_permission(self, request, view):
        return (
            request.user.is_active
            and (request.user.role == User.Role.MANAGER or request.user.role == User.Role.ADMIN)
        )


class IsSuperOrManager(BasePermission):
    # for only high security manger endpoints
    def has_permission(self, request, view):
        return (
            request.user.is_active
            and (request.user.role == User.Role.MANAGER or request.user.role == User.Role.SUPER)
        )

