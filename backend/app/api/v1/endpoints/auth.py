from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import UserLogin, Token, User
from app.services.auth_service import AuthService
from app.api.deps import get_auth_service, get_current_user

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin, auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate user and return access token"""
    try:
        user = auth_service.authenticate_user(login_data.username, login_data.password)
        access_token = auth_service.create_access_token(user.username)

        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user
