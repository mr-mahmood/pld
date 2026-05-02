from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from users.models import User
from cars.models import Car
from django.core.files.base import ContentFile
from cars.serializers import CarSerializer
from authentication.permissions import IsSuperOrManager
from authentication.models import SecurityEvent
from core.utils import log_security_event, get_client_ip, build_update_audit_message
from typing import cast
from core.exceptions import APIError, CarsError

class CarAPIView(APIView):
    permission_classes = [IsSuperOrManager]
    serializer_class = CarSerializer
    
    def get(self, request, pk=None):
        acting_user: User = request.user
        if pk:
            car = Car.get_car(car_id=pk, current_user=acting_user)
            return Response({
                "message": "car fetched successfully",
                "car": self.serializer_class(car, context={"request": request}).data
            }, status=status.HTTP_200_OK)
            
        else:
            cars = Car.get_all_cars(current_user=acting_user)       
            return Response({
                "message": "cars fetched successfully",
                "cars": self.serializer_class(cars, many=True, context={"request": request}).data
            }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        acting_user: User = request.user
        car = Car.get_car(car_id=pk, current_user=acting_user)
        serializer = self.serializer_class(instance=car, data=request.data, context={"request": request}, partial=True)
        serializer.is_valid(raise_exception=True)

        message = build_update_audit_message(
            instance=car,
            validated_data=serializer.validated_data,
            sensitive_fields=set()
        )
        
        car = cast(Car, serializer.save())

        if message:
            log_security_event(
                user=acting_user,
                event=SecurityEvent.EventType.MANAGER_ACTION,
                severity=SecurityEvent.Severity.INFO,
                ip_address=get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                message=f'{acting_user.role} {acting_user.employe_number} change info ->  car {car.id}.{car.plate}\ndetails:\n{message}'
            )

        return Response({
            "message": "car info changed successfully",
            "car": self.serializer_class(car, context={"request": request}).data
        }, status=status.HTTP_200_OK)
    
    def delete(self, request, pk):
        acting_user: User = request.user
        car = Car.get_car(car_id=pk, current_user=acting_user)
        car.is_active = False
        car.save(update_fields=["is_active"])

        log_security_event(
            user=acting_user,
            event=SecurityEvent.EventType.MANAGER_ACTION,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            message=f'{acting_user.role} {acting_user.employe_number} soft delete ->  car {car.id}.{car.plate}'
        )

        return Response({
            "message": "car deleted successfully",
            "car": self.serializer_class(car, context={"request": request}).data
        }, status=status.HTTP_200_OK)
       
        
class CarEnrollAPIView(APIView):
    permission_classes = [IsSuperOrManager]
    serializer_class = CarSerializer
    
    def post(self, request, user_id):
        acting_user: User = request.user
        owner = User.get_user(user_id, acting_user)
        
        serializer = self.serializer_class(
            data=request.data, 
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        car = cast(Car, serializer.save(owner=owner))
        
        log_security_event(
            user=acting_user,
            event=SecurityEvent.EventType.MANAGER_ACTION,
            severity=SecurityEvent.Severity.INFO,
            ip_address=get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            message=f'{acting_user.role} {acting_user.employe_number} create -> car {car.id}.{car.plate}'
        )
        
        return Response({
            "message": "Create car successfully",
            "car": self.serializer_class(car, context={"request": request}).data
        }, status=status.HTTP_201_CREATED)