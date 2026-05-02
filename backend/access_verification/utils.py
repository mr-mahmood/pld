import io
from PIL import Image
from django.core.files.base import ContentFile
from datetime import datetime
from cars.models import Car
from areas.models import Area
from users.models import User
from gates.models import Gate
from django.core.files.base import ContentFile
from user_permisions.models import AccessPolicy
from access_verification.models import AccessHistory


def get_gate(gate_id):
    """Get gate instance with proper error handling"""
    if not gate_id:
        return None
    
    try:
        return Gate.get_gate(gate_id)
    except Exception as e:
        return None
    

def get_car(plate:str):
    if not plate:
        return None
    
    try:
        return Car.get_car_by_plate_for_backend(plate) 
    except Exception as e:
        return None
    

def get_user(user_id):
    if not user_id:
        return None
    
    try:
        return User.get_user_for_backend(user_id)
    except Exception as e:
        return None


def process_image(image, target_size=(640, 480), quality=100):
    try:
        # Read image bytes
        image_bytes = image.read()
        
        # Open with PIL
        with Image.open(io.BytesIO(image_bytes)) as img:
            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            
            # Resize with high-quality resampling
            # resized_image = img.resize(target_size, Image.Resampling.LANCZOS)
            
            # Save resized image to BytesIO
            resized_bytes = io.BytesIO()
            img.save(
                resized_bytes, 
                format='JPEG', 
                quality=quality, 
                optimize=True,
                progressive=True
            )
            
            # Generate unique filename using timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            unique_filename = f"capture_{timestamp}.jpg"
            
            # Create ContentFile with the image data
            image_content = ContentFile(resized_bytes.getvalue(), name=unique_filename)
        
        return image_content
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return None
    


def check_access_permission(user: User | None, gate: Gate | None):
    """Check if user has access permission"""
    
    # Case: user not found in system
    if not user:
        return AccessHistory.Status.DENIED, "Access denied - User not found in database"
    
    # Case 3: user is inactive
    if not user.is_active:
        return AccessHistory.Status.DENIED, "Access denied - user is not active"
    
    # Case: No gate specified
    if not gate:
        return AccessHistory.Status.DENIED, "Access denied - no gate specified"
    
    # Case: Area is inactive
    if not gate.is_active:
        return AccessHistory.Status.DENIED, "Access denied - gate is not active"
    
    area: Area = gate.area
    # Case: Area is inactive
    if not area.is_active:
        return AccessHistory.Status.DENIED, "Access denied - area is not active"
    
    # Case: Check area access permission
    try:
        has_access = AccessPolicy.has_access(user_id=user.id, area_id=area.id)
    except Exception as e:
        return AccessHistory.Status.DENIED, "Access denied - policy check failed"
    
    if has_access:
        return AccessHistory.Status.ALLOWED, f"Access granted"
    else:
        return AccessHistory.Status.DENIED, f"Access denied - user {user.id} does not have access to this area"


def create_access_history(car, user, gate, area, status, reason, confidence, original_image, generated_image):
    """Create and save access history record"""
    access_history = AccessHistory(
        car=car,
        user=user,
        gate=gate,
        area=area,
        status=status,
        original_image=None,
        generated_image=None,
        reason=reason,
        confidence=confidence
    )
    
    access_history.save()
    
    access_history.original_image = original_image
    access_history.generated_image = generated_image
    
    access_history.save(update_fields=["original_image", "generated_image"])

    return access_history