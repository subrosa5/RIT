"""Idempotent seed data — safe to run against an already-seeded database.
Run with: python -m scripts.seed (from apps/api, inside the venv)
"""
import asyncio

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, Base, engine
from app.models.models import Initiative, InitiativeStatus, Region, Role, User

REGIONS = [
    ("Республика Татарстан", "Приволжский"),
    ("Новосибирская область", "Сибирский"),
    ("Тульская область", "Центральный"),
    ("Приморский край", "Дальневосточный"),
]

SPHERES = ["Здравоохранение", "Образование", "Бизнес-среда", "Городская среда"]


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        region_map: dict[str, Region] = {}
        for name, district in REGIONS:
            existing = await db.scalar(select(Region).where(Region.name == name))
            if existing:
                region_map[name] = existing
                continue
            region = Region(name=name, federal_district=district)
            db.add(region)
            region_map[name] = region
        await db.flush()

        admin = await db.scalar(select(User).where(User.email == "admin@rit.dev"))
        if not admin:
            admin = User(
                email="admin@rit.dev",
                full_name="Куратор Демо",
                password_hash=hash_password("ChangeMe123!"),
                role=Role.admin,
            )
            db.add(admin)
            await db.flush()

        existing_count = await db.scalar(select(func.count()).select_from(Initiative))
        if not existing_count:
            samples = [
                ("Единое окно для малого бизнеса", "Здравоохранение"),
                ("Цифровой двойник поликлиники", "Здравоохранение"),
                ("Наставничество для школьных стартапов", "Образование"),
            ]
            region_list = list(region_map.values())
            for i, (title, sphere) in enumerate(samples):
                db.add(
                    Initiative(
                        title=title,
                        description=f"Демонстрационная инициатива «{title}» для региона "
                        f"{region_list[i % len(region_list)].name}. Заполняется реальными "
                        "данными при переходе от seed-данных к продовому контенту.",
                        sphere=sphere,
                        status=InitiativeStatus.in_review,
                        region_id=region_list[i % len(region_list)].id,
                        author_id=admin.id,
                    )
                )

        await db.commit()
    print("seed: ok (admin@rit.dev / ChangeMe123! — смени пароль перед реальным использованием)")


if __name__ == "__main__":
    asyncio.run(seed())
