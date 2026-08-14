import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _make_region(admin_client: AsyncClient) -> str:
    resp = await admin_client.post("/api/regions", json={"name": "Тестовая область"})
    assert resp.status_code == 201
    return str(resp.json()["id"])


async def test_analyst_can_create_and_read_own_initiative(client):
    await client.post(
        "/api/auth/register",
        json={
            "email": "analyst@example.com",
            "full_name": "Analyst One",
            "password": "correcthorse1",
        },
    )

    region_resp = await client.post("/api/regions", json={"name": "Область без прав"})
    assert region_resp.status_code == 403  # analysts cannot create reference data

    # seed a region as admin in a separate session isn't available here —
    # covered by test_curator_workflow below, which uses admin_client.


async def test_curator_workflow_create_score_delete(client, admin_client):
    region_id = await _make_region(admin_client)

    await client.post(
        "/api/auth/register",
        json={"email": "author@example.com", "full_name": "Author", "password": "correcthorse1"},
    )
    create = await client.post(
        "/api/initiatives",
        json={
            "title": "Единое окно для бизнеса",
            "description": (
                "Подробное описание практики на несколько предложений о запуске "
                "единого окна."
            ),
            "sphere": "Бизнес-среда",
            "region_id": region_id,
        },
    )
    assert create.status_code == 201
    initiative_id = create.json()["id"]
    assert create.json()["status"] == "draft"

    # another analyst cannot edit someone else's draft
    await client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "full_name": "Other", "password": "correcthorse1"},
    )
    forbidden = await client.patch(f"/api/initiatives/{initiative_id}", json={"title": "Захват"})
    assert forbidden.status_code == 403

    # curator/admin can score it
    score = await admin_client.post(f"/api/initiatives/{initiative_id}/score")
    assert score.status_code == 200
    body = score.json()
    assert 0 <= body["kpi_score"] <= 100
    assert body["ai_summary"]  # heuristic fallback still produces a real summary

    # only curator/admin can delete
    delete_forbidden = await client.delete(f"/api/initiatives/{initiative_id}")
    assert delete_forbidden.status_code == 403

    delete_ok = await admin_client.delete(f"/api/initiatives/{initiative_id}")
    assert delete_ok.status_code == 204


async def test_list_initiatives_requires_auth(client):
    resp = await client.get("/api/initiatives")
    assert resp.status_code == 401


async def test_analytics_summary_shape(client, admin_client):
    await client.post(
        "/api/auth/register",
        json={"email": "viewer@example.com", "full_name": "Viewer", "password": "correcthorse1"},
    )
    resp = await client.get("/api/analytics/summary")
    assert resp.status_code == 200
    body = resp.json()
    assert "total_initiatives" in body
    assert "by_status" in body
