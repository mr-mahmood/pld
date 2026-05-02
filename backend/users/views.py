from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from authentication.models import SecurityEvent
from core.utils import log_security_event, get_client_ip, build_update_audit_message
from authentication.permissions import IsSuperOrManager
from users.serializers import UserProfileSerializer
from users.models import User
from authentication.models import SecurityEvent
from core.exceptions import APIError, UserRoleError
from typing import cast


class UserAPIView(APIView):
    permission_classes = [IsSuperOrManager]
    serializer_class = UserProfileSerializer

    def get(self, request, pk=None):
        current_user: User = request.user

        if pk:  # Retrieve single user
            user = User.get_user(user_id=pk, current_user=current_user)
            
            return Response({
                "message": "User fetched successfully",
                "user": self.serializer_class(user, context={"request": request}).data
            }, status=status.HTTP_200_OK)
            
        else:
            users = User.get_all_user(current_user=current_user)
                
            return Response({
                "message": "Users fetched successfully",
                "users": self.serializer_class(users, many=True, context={"request": request}).data
            }, status=status.HTTP_200_OK)

    def post(self, request):
        current_user: User = request.user
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = cast(User, serializer.save()) 

        log_security_event(
            user=current_user,
            event=SecurityEvent.EventType.ACCOUNT_CREATED,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            
            message=f"{current_user.role} {current_user.employe_number} create -> User '{user.employe_number}({user.role})'"
        )

        return Response({
            "message": "Sign Up successfully",
            "user": self.serializer_class(user, context={"request": request}).data
        }, status=status.HTTP_201_CREATED)

    def put(self, request, pk):
        current_user: User = request.user
        user = cast(User, User.get_user(user_id=pk, current_user=current_user)) 
        serializer = self.serializer_class(
            instance=user,
            data=request.data,
            context={"request": request},
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        message = build_update_audit_message(
            instance=user,
            validated_data=serializer.validated_data,
            sensitive_fields={"password"}
        )
        updated_user = cast(User, serializer.save()) 
        
        event_type = SecurityEvent.EventType.MANAGER_ACTION if current_user.id != user.id else SecurityEvent.EventType.PROFILE_UPDATED
        if current_user.id != user.id:
            log_message = f"{current_user.role} {current_user.employe_number} change detail -> User '{updated_user.employe_number}({updated_user.role})'\ndetails are:\n{message}"
        else:
            log_message = f"{user.role} {user.employe_number} updated its profile\n details: {message}"
            
        if message:
            log_security_event(
                user=current_user,
                event=event_type,
                severity=SecurityEvent.Severity.INFO,
                ip_address=get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                message=log_message,
            )

        return Response({
            "message": "Profile updated successfully",
            "user": self.serializer_class(updated_user, context={"request": request}).data
        }, status=status.HTTP_200_OK)
        
    def delete(self, request, pk):
        current_user: User = request.user
        user = User.get_user(user_id=pk, current_user=current_user)
        user.is_active = False
        user.save(update_fields=["is_active"])
        
        log_security_event(
            user=current_user,
            event=SecurityEvent.EventType.ACCOUNT_DEACTIVATED,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            message=f"{current_user.role} {current_user.employe_number} soft delete -> User '{user.employe_number}({user.role})'"
        )
        
        return Response({
            "message": "user deactivated successfully",
            "user": self.serializer_class(user, context={"request": request}).data
        }, status=status.HTTP_200_OK)


class DashboardAPIView(APIView):
    permission_classes = []
    serializer_class = UserProfileSerializer
    
    def get(self, request):
        user: User = request.user  # Get the logged-in user
        serializer = self.serializer_class(user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    

    def put(self, request):
        user: User = request.user
        serializer = self.serializer_class(instance=user, data=request.data, context={"request": request}, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()
        
        message = build_update_audit_message(
            instance=user,
            validated_data=serializer.validated_data,
            sensitive_fields={"password"}
        )

        log_security_event(
            user=user,
            event=SecurityEvent.EventType.PROFILE_UPDATED,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            message=f"{user.role} {user.employe_number} updated its profile\n details: {message}"
        )

        return Response({
            "message": "Profile updated successfully",
            "user": self.serializer_class(updated_user, context={"request": request}).data
        }, status=status.HTTP_200_OK)