from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from user_permisions.models import AccessPolicy
from user_permisions.serializers import AccessPolicySerializer
from authentication.permissions import IsSuperOrManager
from core.exceptions import APIError, UserAccountError, AccessPolicyError
from authentication.models import SecurityEvent
from core.utils import log_security_event, get_client_ip, build_access_policy_audit_message
from users.models import User
from typing import cast


class AccessPolicyAPIView(APIView):
    permission_classes = [IsSuperOrManager]
    serializer_class = AccessPolicySerializer

    def post(self, request, pk):
        acting_user: User = request.user
        target_user: User = User.get_user(user_id=pk, current_user=acting_user)
        
        try:
            temp = AccessPolicy.get_user_policy(target_user.id)
            if temp:
                raise APIError(AccessPolicyError.ACCESS_POLICY_ALREADY_EXIST)
        except:
            pass
        
        serializer = self.serializer_class(data=request.data, context={'target_user': target_user, 'acting_user': acting_user})
        serializer.is_valid(raise_exception=True)
        policy = cast(AccessPolicy, serializer.save())
        user_instance: User = policy.user

        log_security_event(
            user=acting_user,
            event=SecurityEvent.EventType.MANAGER_ACTION,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            message=f'{acting_user.role} {acting_user.employe_number} created AccessPolicy for user {user_instance.employe_number}'
        )

        return Response({
            "message": "Access policy created successfully",
        }, status=status.HTTP_201_CREATED)

    def put(self, request, pk):
        acting_user: User = request.user
        target_user: User = User.get_user(user_id=pk, current_user=acting_user)
        
        try:
            # pk here is the user's ID, not the policy ID
            policy = self.get_queryset().get(user_id=pk)
        except AccessPolicy.DoesNotExist:
            raise APIError(UserAccountError.USER_NOT_EXIST)

        serializer = self.serializer_class(data=request.data, instance=policy, partial=True, context={'target_user': target_user, 'acting_user': acting_user})
        serializer.is_valid(raise_exception=True)

        message = build_access_policy_audit_message(
            instance=policy,
            validated_data=serializer.validated_data
        )

        policy = cast(AccessPolicy, serializer.save())
        user_instance: User = policy.user

        if message:
            log_security_event(
                user=acting_user,
                event=SecurityEvent.EventType.MANAGER_ACTION,
                severity=SecurityEvent.Severity.INFO,
                ip_address=get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                message=f'{acting_user.role} {acting_user.employe_number} updated AccessPolicy for user {user_instance.employe_number}\ndetails:\n{message}'
            )
        
        return Response({
            "message": "Access policy updated successfully",
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        acting_user: User = request.user
        try:
            # pk here is the user's ID, not the policy ID
            policy = self.get_queryset().get(user_id=pk)
            user_instance: User = policy.user
        except AccessPolicy.DoesNotExist:
            raise APIError(UserAccountError.USER_NOT_EXIST)
        
        policy.delete()

        log_security_event(
            user=acting_user,
            event=SecurityEvent.EventType.MANAGER_ACTION,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            message=f'{acting_user.role} {acting_user.employe_number} deleted AccessPolicy for user {user_instance.employe_number}'
        )

        return Response({
            "message": "Access policy deleted successfully",
        }, status=status.HTTP_200_OK)

    def get_queryset(self):
        # Prefetch areas for each policy
        return AccessPolicy.get_all_access_roles()
