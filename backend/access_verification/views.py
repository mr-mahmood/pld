import time
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from authentication.permissions import IsSuperOrManager
from users.models import User
from gates.models import Gate
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from access_verification.serializers import AccessCheckSerializer, LightAccessHistorySerializer
from access_verification.models import AccessHistory
import access_verification.utils as util
from typing import cast
from core.exceptions import APIError, GateError

class AccessCheckAPIView(APIView):
    permission_classes = []
    authentication_classes = []
    serializer_class = AccessCheckSerializer

    def post(self, request):
        start = time.time()
        
        # Validate request data
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        

        image = serializer.validated_data.get('image') # type: ignore
        plate = serializer.validated_data.get('plate') # type: ignore
        gate_id = serializer.validated_data.get('gate') # type: ignore
        confidence = serializer.validated_data.get('confidence') # type: ignore

        # Get gate instance
        gate: Gate | None = util.get_gate(gate_id)
        if not gate:
            raise APIError(GateError.GATE_NOT_EXIST)
        
        original_image = util.process_image(image)
        # Generate plate image
        from cars.image_generator import generate_plate_image
        generated_image = generate_plate_image(plate) # type: ignore
        
        car = util.get_car(str(plate))

        if not car:
            user = None
        else:
            # Determine user from recognition result
            user = util.get_user(car.owner.id)
        
        # Check access permission
        access_status, reason = util.check_access_permission(
            user=user,
            gate=gate,
        )
        
        # Create access history record with ALL images
        access_history = util.create_access_history(
            car=car,
            user=user,
            gate=gate,
            area=gate.area,
            status=access_status,
            reason=reason,
            confidence=confidence,
            original_image=original_image,
            generated_image=generated_image,
        )
        
        # Serialize the result
        response_serializer = LightAccessHistorySerializer(
            access_history, 
            context={'request': request}
        )
        
        end = time.time()
        processing_time = (end - start) * 1000
        
        # --- Send to WebSocket if gate exists ---
        if gate:
            channel_layer = get_channel_layer()
            if channel_layer is not None:
                group_name = f"gate_{gate.id}"
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "access_event",
                        "data": response_serializer.data
                    }
                )
        
        return Response({
            "message": "Access verification completed",
            "access": response_serializer.data,
            "processing_time_ms": processing_time
        }, status=status.HTTP_200_OK)
        

class AccessHistoryAPIView(APIView):
    permission_classes = [IsSuperOrManager]
    serializer_class = LightAccessHistorySerializer
    
    def get(self, request, pk=None):
        current_user: User = request.user
        
        if pk:
            acces_history = AccessHistory.get_access_history(pk, current_user)
            serializer = self.serializer_class(acces_history, context={"request": request})
            return Response({
                "message": "Access history fetched successfully",
                "access_history": serializer.data
            }, status=status.HTTP_200_OK)
            
        else:
            access_history = AccessHistory.get_all_access_history(current_user)
            serializer = self.serializer_class(access_history, many=True, context={"request": request})         
            return Response({
                "message": "Access history fetched successfully",
                "access_history": serializer.data
            }, status=status.HTTP_200_OK)