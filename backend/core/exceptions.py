from rest_framework.exceptions import APIException


class APIError(APIException):
    status_code = 400
    
    def __init__(self, error: tuple):
        self.detail = {
            "code": error[0],
            "message": error[1],
        }


# ============================================================================
# AUTHENTICATION APP (0-99)
# Each class gets 20 slots
# ============================================================================

class AuthSessionError(APIError):
    """Session, cookies, token version errors (0-19)"""
    SESSION_EXPIRE = (1, "Session expired. Please log in again")
    COOKIES_NOT_PROVIDE = (2, "No cookies found in request")
    INVALID_REFRESH_TOKEN = (3, "Invalid or expired refresh token")
    INVALID_ACCESS_TOKEN = (4, "Expired access token")
    NO_REFRESH_TOKEN = (5, "No refresh token provided in request cookie")
    # 5-19 available


class AuthLoginError(APIError):
    """Login credential errors (20-39)"""
    INVALID_LOGIN_CREDENTIAL = (20, "Invalid credential for login")
    # 21-39 available


class AuthPasswordError(APIError):
    """Password change and validation errors (40-59)"""
    TWO_PASSWORD_NOT_MATCH = (40, "New password and the repeat do not match")
    OLD_PASSWORD_INCORRECT = (41, "Old password is incorrect")
    PASSWORD_IS_WEAK = (42, "New password is not strong")
    PASSWORD_IS_REQUIRED = (43, "Password is required for this role")
    # 44-59 available


class AuthOTPError(APIError):
    """OTP verification errors (60-79)"""
    OTP_NOT_FOUND = (60, "OTP code not found or expired")
    OTP_NOT_CORRECT = (61, "OTP code not correct")
    # 62-79 available


# 80-99 reserved for future auth features


# ============================================================================
# USERS APP (100-199)
# Each class gets 20 slots
# ============================================================================

class UserAccountError(APIError):
    """User existence and account status errors (100-119)"""
    USER_NOT_EXIST = (100, "User does not exist, or inactive")
    FORBIDDEN_ACTION = (101, "You are not allowed for this action")
    # 102-119 available


class UserDuplicateError(APIError):
    """Unique field duplication errors (120-139)"""
    PHONE_NUMBER_REUSE = (120, "This phone number already exists")
    NATIONAL_ID_REUSE = (121, "This National ID already exists")
    EMPLOYE_NUMBER_REUSE = (122, "This Employee Number already exists")
    # 123-139 available


class UserRoleError(APIError):
    """Role-based permission errors (140-159)"""
    MANAGER_NOT_ALLOW = (140, "A manager cannot create, see, or edit other manager or super")
    NOT_ALLOW_CHANGE_ROLE = (141, "No user can change its own role")
    USER_CREATE_NOT_ALLOW = (142, "You cannot make or edit a user with same or higher role than yourself")
    INVALID_ROLE = (143, "Not a valid Role")
    # 144-159 available


class UserValidationError(APIError):
    """User field format validation errors (160-179)"""
    INVALID_PHONE_NUMBER = (160, "Phone number must start with 09 and be 11 digits")
    INVALID_NATIONAL_ID = (161, "National ID must be 10 digits")
    # 162-179 available


# 180-199 reserved for future users features


# ============================================================================
# Cars APP (200-299)
# Each class gets 20 slots
# ============================================================================

class CarsError(APIError):
    """cars validation and existence errors (200-219)"""
    CAR_NOT_EXIST = (200, "Car does not exist")
    CAR_EXIST = (201, "Car already exist in database")
    CAR_MAKE_ERROR = (202, 'An error happend while making new car')
    MANAGER_CANNOT_CREATE_CAR_FOR_SUPERIOR = (203, 'Manager cant create car for other managers or supers')
    # 202-219 available

class PlateError(APIError):
    """plate validation and existence errors (200-219)"""
    INVALID_PLATE_FORMAT = (220, "Plate number is invalid, correct example: 1-2-12-3-6-5-1-1")
    INVALID_IMAGE = (221, "Image is empty or invalid or no image provided")
    # 221-239 available

# 240-299 reserved for future cars features


# ============================================================================
# CV / ACCESS VERIFICATION APP (300-399)
# Each class gets 20 slots
# ============================================================================

class CVTokenError(APIError):
    """CV app authentication errors (300-319)"""
    NOT_CV = (300, "Not from CV request")
    # 301-319 available


class AccessHistoryError(APIError):
    """Access history errors (320-339)"""
    ACCESS_HISTORY_NOT_EXIST = (320, "No access history")
    # 321-339 available


# 340-399 reserved for future CV/access verification features


# ============================================================================
# AREAS APP (400-499)
# Each class gets 20 slots
# ============================================================================

class AreaError(APIError):
    """Area existence and validation errors (400-419)"""
    AREA_NOT_EXIST = (400, "Area does not exist, or inactive")
    AREA_EXIST = (401, "Area already exists in database")
    AREA_CANT_BE_EMPTY = (402, "Areas must be provided with at least one gate in it")
    # 403-419 available


# 420-499 reserved for future areas features


# ============================================================================
# GATES APP (500-599)
# Each class gets 20 slots
# ============================================================================

class GateError(APIError):
    """Gate existence and validation errors (500-519)"""
    GATE_NOT_EXIST = (500, "Gate does not exist")
    GATE_EXIST = (501, "Gate already exists in database")
    GATE_AREA_NOT_ALLOW = (502, "Not allowed to change a Gate's area")
    # 503-519 available


class CameraError(APIError):
    """Camera validation errors (520-539)"""
    CAMERA_EXIST = (520, "Camera already exists in database")
    INVALID_CAMERA_IP = (521, "Camera IP is not a valid IP pattern")
    # 522-539 available


# 540-599 reserved for future gates features


# ============================================================================
# USER PERMISSIONS APP (600-699)
# Each class gets 20 slots
# ============================================================================

class AccessPolicyError(APIError):
    """Access policy errors (600-619)"""
    ACCESS_POLICY_ALREADY_EXIST = (600, "Access policy for this user already exists")
    ACCESS_POLICY_NOT_EXIST = (601, "No access policy for this user exists")
    AREA_ACCESS_POLICY_NOT_EXIST = (602, "No access policy for this area exists")
    # 603-619 available


# 620-699 reserved for future user permissions features


# ============================================================================
# FUTURE APPS (700-999)
# Each new app gets 100-number block
# ============================================================================

# 700-799: Available for future app
# 800-899: Available for future app
# 900-999: Available for future app




""" class CustomeUserError(APIError):
    USER_NOT_EXIST = (100, "User does not exist, or inactive")
    SESSION_EXPIRE = (101, "Session expired. Please log in again")
    COOKIES_NOT_PROVIDE = (102, "no cookiess found in request")
    FORBIDDEN_ACTION = (103, "You are not allowed for this action")


class CustomePermissionError(APIError):
    NO_REFRESH_TOKEN = (200, "No refresh token provided in request cookie")
    PHONE_NUMBER_REUSE = (201, "This phone number already exists")
    NATIONAL_ID_REUSE = (202, "This National ID already exists")
    EMPLOYE_NUMBER_REUSE = (203, "This Employe Number already exists")
    MANAGER_NOT_ALLOW = (204, "A manager can`t create, see, or edit other manager or super")
    NOT_ALLOW_CHANGE_ROLE = (205, "No user can`t change its own role")
    NOT_CV = (206, "Not from CV request")
    USER_CREATE_NOT_ALLOW = (207, "you cant make or edit a user with same or higer role than your self")


class CustomeValidationError(APIError):
    TWO_PASSWORD_NOT_MATCH = (300, "new Password and the repet do not match")
    INVALID_LOGIN_CREDENTIAL = (301, "Invalid credential for login")
    OLD_PASSWORD_INCORRECT = (302, "Old password is incorrect")
    INVALID_REFRESH_TOKEN = (303, "Invalid or expired refresh token")
    INVALID_PHONE_NUMBER = (304, "Phone number must start with 09 and be 11 digits")
    INVALID_NATIONAL_ID = (305, "National ID must be 10 digits")
    PASSWORD_IS_WEAK = (306, "new Password is not strong")
    INVALID_ACCESS_TOKEN = (307, "expired access token")
    PASSWORD_IS_REQUIRED = (308, "Password is required for this role.")
    INVALID_ROLE = (309, "Not a valid Role")
    INVALID_IMAGE = (310, "error, image is empty or invalid or no image provided")
    IMAGE_NOT_EXIST = (311, "No refrence images exist for the preovided info")
    OTP_NOT_FOUND = (312, "OTP code not found or expired")
    OTP_NOT_CORRECT = (313, "OTP code not correct")
    


class CustomeAccessControlError(APIError):
    AREA_NOT_EXIST = (400, "Area does not exist, or inactive")
    AREA_EXIST = (401, "Area already exist in database")
    CAMERA_EXIST = (402, "Camera already exist in database")
    INVALID_CAMERA_IP = (403, "Camera ip is not a valida ip pattern")
    GATE_NOT_EXIST = (404, "Gate does not exist")
    GATE_EXIST = (405, "Gate already exist in database")
    GATE_AREA_NOT_ALLOW = (406, "Not allowed to change a Gate`s area")
    ACCESS_POLICY_ALREADY_EXIST = (407, "access policy for this user already exist")
    ACCESS_POLICY_NOT_EXIST = (408, "no access policy for this user exist")
    AREA_ACCESS_POLICY_NOT_EXIST = (409, "no access policy for this area exist")
    AREA_CANT_BE_EMPTY = (410, "Areas must be provide with at least one gate in it")
    NO_REFERENCE_IMAGES = (411, "No reference images for the given user")
    ACCESS_HISTORY_NOT_EXIST = (412, "no access history")
 """