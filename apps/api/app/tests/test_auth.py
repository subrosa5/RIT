import pytest

pytestmark = pytest.mark.asyncio


async def test_register_then_me(client):
    resp = await client.post(
        "/api/auth/register",
        json={"email": "a@example.com", "full_name": "Ana Test", "password": "correcthorse1"},
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == "a@example.com"
    assert "access_token" in resp.cookies

    me = await client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["role"] == "analyst"


async def test_register_duplicate_email_rejected(client):
    payload = {"email": "dup@example.com", "full_name": "Dup User", "password": "correcthorse1"}
    first = await client.post("/api/auth/register", json=payload)
    assert first.status_code == 201
    second = await client.post("/api/auth/register", json=payload)
    assert second.status_code == 409


async def test_weak_password_rejected(client):
    resp = await client.post(
        "/api/auth/register",
        json={"email": "weak@example.com", "full_name": "Weak Pw", "password": "aaaaaaaaaa"},
    )
    assert resp.status_code == 422


async def test_login_wrong_password_returns_generic_401(client):
    await client.post(
        "/api/auth/register",
        json={"email": "b@example.com", "full_name": "B User", "password": "correcthorse1"},
    )
    resp = await client.post(
        "/api/auth/login", json={"email": "b@example.com", "password": "wrong1pass"}
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "invalid email or password"


async def test_me_without_cookie_is_401(client):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


async def test_refresh_flow(client):
    await client.post(
        "/api/auth/register",
        json={"email": "c@example.com", "full_name": "C User", "password": "correcthorse1"},
    )
    resp = await client.post("/api/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.json()
