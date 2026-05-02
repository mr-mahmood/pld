from rest_framework.response import Response
from rest_framework.generics import GenericAPIView
from rest_framework import status
from users.models import User
from gates.models import Gate
from gates.serializers import GateSerializer
from authentication.permissions import IsSuper
from authentication.auth import CvTokenAuthentication
from authentication.models import SecurityEvent
from core.utils import log_security_event, get_client_ip, build_update_audit_message
from typing import cast

class GateAPIView(GenericAPIView):
    permission_classes = [IsSuper]
    serializer_class = GateSerializer
    
    def get(self, request, pk=None):
        if pk:
            gate = Gate.get_gate(gate_id=pk)
            serializer = self.get_serializer(gate)
            return Response({
                "message": "gates fetched successfully",
                "gate": serializer.data
            }, status=status.HTTP_200_OK)
            
        else:
            gates = Gate.get_all_gate()
            serializer = self.get_serializer(gates, many=True)         
            return Response({
                "message": "gates fetched successfully",
                "gates": serializer.data
            }, status=status.HTTP_200_OK)
    
    def post(self, request):
        acting_user: User = request.user
        serializer = self.get_serializer(data=request.data, context={'gate': None})
        serializer.is_valid(raise_exception=True)
        gate = cast(Gate, serializer.save())

        log_security_event(
            user=acting_user,
            event=SecurityEvent.EventType.MANAGER_ACTION,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            
            message=f'{acting_user.role} {acting_user.employe_number} create ->  gate {gate.id}.{gate.name}'
        )

        return Response({
            "message": "Create gate successfully",
            "gate": serializer.data
        }, status=status.HTTP_201_CREATED)
            
    def put(self, request, pk):
        acting_user: User = request.user
        gate = Gate.get_gate(gate_id=pk)
        serializer = self.get_serializer(data=request.data, instance=gate, partial=True, context={'gate': gate})
        serializer.is_valid(raise_exception=True)

        message = build_update_audit_message(
            instance=gate,
            validated_data=serializer.validated_data,
            sensitive_fields=set()
        )
        
        gate = cast(Gate, serializer.save())

        if message:
            log_security_event(
                user=acting_user,
                event=SecurityEvent.EventType.MANAGER_ACTION,
                severity=SecurityEvent.Severity.INFO,
                ip_address=get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                
                message=f'{acting_user.role} {acting_user.employe_number} change info ->  gate {gate.id}.{gate.name}\ndetails:\n{message}'
            )

        return Response({
            "message": "gate info changed successfully",
            "gate": serializer.data
        }, status=status.HTTP_200_OK)
    
    def delete(self, request, pk):
        current_user: User = request.user
        gate: Gate = Gate.get_gate(gate_id=pk)
        gate.is_active = False
        gate.save(update_fields=["is_active"])

        log_security_event(
            user=current_user,
            event=SecurityEvent.EventType.MANAGER_ACTION,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            
            message=f'{current_user.role} {current_user.employe_number} soft delete ->  gate {gate.id}.{gate.name}'
        )

        # Serialize the gate
        serializer = GateSerializer(gate)

        return Response({
            "message": "gate deleted successfully",
            "gate": serializer.data
        }, status=status.HTTP_200_OK)
    
    
class CvGateAPIView(GenericAPIView):
    authentication_classes = [CvTokenAuthentication]
    permission_classes = []
    serializer_class = GateSerializer
    
    def get(self, request):
        gates = Gate.get_all_gate()
        gates = gates.filter(is_active=True)
        serializer = self.get_serializer(gates, many=True)         
        return Response({
            "message": "gates fetched successfully",
            "gates": serializer.data
        }, status=status.HTTP_200_OK)