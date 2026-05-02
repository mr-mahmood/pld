from rest_framework.renderers import JSONRenderer
from core.exceptions import UserAccountError, AreaError, AuthPasswordError, AuthSessionError, UserAccountError


def check_error(data):
    if data.get('user'):
        if 'Invalid pk' in data.get('user')[0]:
            data['code'] = UserAccountError.USER_NOT_EXIST[0]
            data['message'] = UserAccountError.USER_NOT_EXIST[1]

    if data.get('code') == "token_not_valid":
        data['code'] = AuthSessionError.INVALID_ACCESS_TOKEN[0]
        data['message'] = AuthSessionError.INVALID_ACCESS_TOKEN[1]
        
    if data.get('non_field_errors'):
        data['code'] = AuthPasswordError.PASSWORD_IS_WEAK[0]
        data['message'] = AuthPasswordError.PASSWORD_IS_WEAK[1]

    if data.get('area'):
        if 'Invalid pk' in data.get('area')[0]:
            data['code'] = AreaError.AREA_NOT_EXIST[0]
            data['message'] = AreaError.AREA_NOT_EXIST[1]

    if data.get('areas'):
        if 'Invalid pk' in data.get('areas')[0]:
            data['code'] = AreaError.AREA_NOT_EXIST[0]
            data['message'] = AreaError.AREA_NOT_EXIST[1]
          
    if data.get('detail') == 'You do not have permission to perform this action.':
        data['code'] = UserAccountError.FORBIDDEN_ACTION[0]
        data['message'] = UserAccountError.FORBIDDEN_ACTION[1]
    
    return data


class GlobalJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get("response") # type: ignore

        # Bypass non-DRF responses (e.g. file downloads)
        if response is None:
            return super().render(data, accepted_media_type, renderer_context)

        status_code = response.status_code
        success = 200 <= status_code < 300

        if not success:
            response.data = check_error(response.data)
            
        code = response.data.get('code', None)
        message = response.data.get('message', None)
        try:
            data.pop('message')
        except:
            pass

        payload = {
            "success": success,
        }
        if message:
            payload['message'] = message
        if success:
            if data:
                payload["data"] = data   
        else:     
            if code != None:   
                payload["code"] = code
            else:
                if data:
                    payload["error"] = data
            
        return super().render(payload, accepted_media_type, renderer_context)
