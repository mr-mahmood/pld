from django.contrib.staticfiles import finders
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile
from datetime import datetime
from io import BytesIO


def generate_plate_image(plate_number: str) -> BytesIO | None:
    """
    Generate a plate image from the plate number.
    Returns BytesIO object ready to save to ImageField.
    """
    # Parse plate number format (e.g., "1-9-12-3-6-5-2-2" or similar)
    # Adjust this based on your plate format
    plate_parts = [int(i) for i in plate_number.split('-')]
    CHAR_VALUE = plate_parts[2]
    plate_parts.pop(2)
    BASE_IMAGE_PATH = finders.find(f'cars/base_plates/plate_{CHAR_VALUE}.png')
    FONT_FILE_PATH = finders.find('cars/fonts/stitrbd.ttf')
    
    # Configuration
    FONT_SIZE = 260
    TEXT_COLOR = (0, 0, 0) if CHAR_VALUE not in [10, 13, 16, 29] else (255, 255, 255)
    
    START_POSITIONS = [
        (135, 70),
        (285, 70),
        (710, 70),
        (870, 70),
        (1030, 70),
        (1215, 110),
        (1350, 110),
    ]
    
    try:
        # Open template
        if BASE_IMAGE_PATH and FONT_FILE_PATH:
            img = Image.open(BASE_IMAGE_PATH)
            draw = ImageDraw.Draw(img)
    
            base_font = ImageFont.truetype(FONT_FILE_PATH, FONT_SIZE)
            
            # Draw each part
            for i, part in enumerate(plate_parts):
                current_font = base_font
                if i >= 5:  # Adjust last parts font size
                    try:
                        current_font = ImageFont.truetype(FONT_FILE_PATH, FONT_SIZE - 30)
                    except:
                        pass
                
                current_x, current_y = START_POSITIONS[i]
                draw.text((current_x, current_y), str(part), fill=TEXT_COLOR, font=current_font)
            
            # Save to BytesIO
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            # Convert to ContentFile with a unique name
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            unique_filename = f"generated_plate_{timestamp}.png"
            
            return ContentFile(buffer.getvalue(), name=unique_filename) # type: ignore
        
    except Exception as e:
        print(f"Error generating plate image: {e}")
        return None