from rest_framework.response import Response
from rest_framework.generics import GenericAPIView
from rest_framework import status
from areas.models import Area
from areas.serializers import AreaSerializer
from authentication.permissions import IsSuper, IsSuperOrManager
from authentication.models import SecurityEvent
from users.models import User
from core.utils import log_security_event, get_client_ip, build_update_audit_message
from typing import cast

class AreaAPIView(GenericAPIView):
    permission_classes = [IsSuper]
    serializer_class = AreaSerializer
    
    def get(self, request, pk=None):
        current_user: User = request.user
        
        if pk:
            area = Area.get_area(area_id=pk)
            serializer = self.get_serializer(area)
            return Response({
                "message": "Area fetched successfully",
                "area": serializer.data
            }, status=status.HTTP_200_OK)
            
        else:
            if current_user.role == "SUPER":
                areas = Area.get_all_area_for_super()
            else:
                areas = Area.get_all_area_for_manager()
            serializer = self.get_serializer(areas, many=True)         
            return Response({
                "message": "Areas fetched successfully",
                "areas": serializer.data
            }, status=status.HTTP_200_OK)
    
    def post(self, request):
        current_user: User = request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        area = cast(Area, serializer.save())

        log_security_event(
            user=current_user,
            event=SecurityEvent.EventType.MANAGER_ACTION,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            message=f'{current_user.role} {current_user.employe_number} create ->  Area {area.id}.{area.name}'
        )

        return Response({
            "message": "Create Area successfully",
            "area": AreaSerializer(area).data
        }, status=status.HTTP_201_CREATED)
    
    def put(self, request, pk):
        current_user: User = request.user
        area = Area.get_area(area_id=pk)
        serializer = self.get_serializer(data=request.data, instance=area, partial=True)
        serializer.is_valid(raise_exception=True)

        message = build_update_audit_message(
            instance=area,
            validated_data=serializer.validated_data,
            sensitive_fields=set()
        )

        area = cast(Area, serializer.save())

        if message:
            log_security_event(
                user=current_user,
                event=SecurityEvent.EventType.MANAGER_ACTION,
                severity=SecurityEvent.Severity.INFO,
                ip_address=get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                message=f'{current_user.role} {current_user.employe_number} change info ->  Area {area.id}.{area.name}\ndetails:\n{message}'
            )

        return Response({
            "message": "Area info changed successfully",
            "area": AreaSerializer(area).data
        }, status=status.HTTP_200_OK)
    
    def delete(self, request, pk):
        current_user: User = request.user
        area = Area.get_area(area_id=pk)
        area.is_active = False
        area.save(update_fields=["is_active"])

        log_security_event(
            user=current_user,
            event=SecurityEvent.EventType.MANAGER_ACTION,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            message=f'{current_user.role} {current_user.employe_number} soft delete ->  Area {area.id}.{area.name}'
        )

        return Response({
            "message": "Area deleted successfully",
            "area": AreaSerializer(area).data
        }, status=status.HTTP_200_OK)