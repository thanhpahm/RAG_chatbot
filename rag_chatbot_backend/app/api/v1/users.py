import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password
from app.dependencies import get_current_admin, get_db
from app.models import User
from app.schemas.user import UserCreate, UserResetPassword, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    search: str | None = Query(default=None),
    role: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    stmt = select(User).order_by(User.created_at.desc())
    if search:
        safe = search.replace("%", r"\%").replace("_", r"\_")
        stmt = stmt.where(or_(User.username.ilike(f"%{safe}%"), User.email.ilike(f"%{safe}%")))
    if role:
        stmt = stmt.where(User.role == role)
    users = (await db.execute(stmt)).scalars().all()
    return list(users)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    existing = await db.scalar(
        select(User).where(or_(User.username == payload.username, User.email == payload.email))
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already exists")

    user = User(
        username=payload.username.strip(),
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "role" in update_data and user_id == current_user.id and update_data["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove your own admin role")
    if "username" in update_data:
        clash = await db.scalar(select(User).where(User.username == update_data["username"], User.id != user_id))
        if clash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
        user.username = update_data["username"].strip()
    if "email" in update_data:
        email = update_data["email"].lower()
        clash = await db.scalar(select(User).where(User.email == email, User.id != user_id))
        if clash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
        user.email = email
    if "role" in update_data:
        user.role = update_data["role"]
    if "is_active" in update_data:
        user.is_active = update_data["is_active"]
        if not update_data["is_active"]:
            user.token_version += 1

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
    await db.delete(user)
    await db.commit()


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: uuid.UUID,
    payload: UserResetPassword,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.hashed_password = hash_password(payload.new_password)
    user.token_version += 1
    await db.commit()
    return {"ok": True}
