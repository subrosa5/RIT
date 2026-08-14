"""Idempotent seed data — safe to run against an already-seeded database.
Run with: python -m scripts.seed (from apps/api, inside the venv)

Seeds enough regions/spheres/initiatives that the dashboard and analysis
views are meaningful on first run, not an empty shell — and pre-scores
about half of them (via the same heuristic the API uses) so the score
breakdown / audit trail UI has real data to show without manually
clicking "Оценить" through every row first.
"""
import asyncio
from dataclasses import asdict

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, Base, engine
from app.models.models import AuditLog, Initiative, InitiativeStatus, Region, Role, User
from app.services.scoring import heuristic_score

REGIONS = [
    ("Республика Татарстан", "Приволжский"),
    ("Новосибирская область", "Сибирский"),
    ("Тульская область", "Центральный"),
    ("Приморский край", "Дальневосточный"),
    ("Свердловская область", "Уральский"),
    ("Краснодарский край", "Южный"),
    ("Архангельская область", "Северо-Западный"),
    ("Ставропольский край", "Северо-Кавказский"),
]

# (title, description, sphere, region_index, status, pre_score)
INITIATIVES = [
    (
        "Единое окно для малого бизнеса",
        "Объединили 12 региональных и федеральных сервисов в одном окне: "
        "регистрация, лицензии, субсидии. Срок оформления сократился с 21 до 5 дней.",
        "Бизнес-среда",
        0,
        InitiativeStatus.recommended,
        True,
    ),
    (
        "Цифровой двойник поликлиники",
        "Модель загрузки кабинетов и очередей в реальном времени на основе данных "
        "МИС. Пилот на 6 поликлиниках показал снижение среднего времени ожидания на 18%.",
        "Здравоохранение",
        4,
        InitiativeStatus.in_review,
        True,
    ),
    (
        "Наставничество для школьных стартапов",
        "Программа парного наставничества старшеклассников и предпринимателей "
        "региона, 40 команд за первый сезон, 6 проектов дошли до акселератора.",
        "Образование",
        2,
        InitiativeStatus.recommended,
        True,
    ),
    (
        "Умные пешеходные переходы",
        "Датчики движения и адаптивная подсветка на 30 нерегулируемых переходах "
        "рядом со школами.",
        "Городская среда",
        1,
        InitiativeStatus.in_review,
        True,
    ),
    (
        "Раздельный сбор отходов во дворах",
        "Контейнеры для раздельного сбора в 150 дворах с системой учёта по QR-коду "
        "и небольшим кэшбэком жителям за сортировку.",
        "Экология",
        5,
        InitiativeStatus.draft,
        False,
    ),
    (
        "Программа переквалификации 45+",
        "Бесплатные курсы по 8 востребованным профессиям для жителей старше 45 лет, "
        "трудоустройство после курса — приоритет партнёрских работодателей.",
        "Кадры и занятость",
        2,
        InitiativeStatus.recommended,
        True,
    ),
    (
        "Единая карта жителя региона",
        "Одна карта для проезда, скидок в музеях и записи в поликлинику вместо "
        "пяти разных приложений.",
        "Городская среда",
        3,
        InitiativeStatus.in_review,
        True,
    ),
    (
        "Телемедицина для отдалённых сёл",
        "Стационарные точки видеосвязи с узкими специалистами в 25 сёлах без "
        "постоянного врача, средняя дистанция до ближайшей больницы — свыше 80 км.",
        "Здравоохранение",
        6,
        InitiativeStatus.recommended,
        True,
    ),
    (
        "Акселератор студенческих проектов",
        "3-месячная программа для команд из региональных вузов с посевным грантом "
        "до 500 тысяч рублей победителям демо-дня.",
        "Образование",
        0,
        InitiativeStatus.in_review,
        False,
    ),
    (
        "Субсидии на энергоэффективный ремонт",
        "Компенсация части расходов на утепление фасадов и замену окон в "
        "многоквартирных домах старше 25 лет.",
        "Экология",
        7,
        InitiativeStatus.draft,
        False,
    ),
    (
        "Биржа вакансий для предпенсионеров",
        "Отдельная витрина вакансий с гарантией отклика работодателя в течение "
        "3 дней и юридической поддержкой при отказе по возрасту.",
        "Кадры и занятость",
        4,
        InitiativeStatus.rejected,
        True,
    ),
    (
        "Портал сопровождения инвесторов",
        "Личный кабинет инвестора с трекингом статуса заявки на землю, "
        "подключение к сетям и меры поддержки — без личного визита в 6 ведомств.",
        "Бизнес-среда",
        1,
        InitiativeStatus.recommended,
        True,
    ),
    (
        "Мобильные бригады узких специалистов",
        "Выездные приёмы кардиолога, эндокринолога и офтальмолога по графику "
        "в райцентрах, где таких врачей нет в штате.",
        "Здравоохранение",
        3,
        InitiativeStatus.in_review,
        False,
    ),
    (
        "Кванториум в каждом райцентре",
        "Детский технопарк с оборудованием по 6 направлениям — от робототехники "
        "до биотехнологий, бесплатно для школьников 10–17 лет.",
        "Образование",
        5,
        InitiativeStatus.recommended,
        True,
    ),
    (
        "Зелёные крыши на муниципальных зданиях",
        "Озеленение плоских крыш детских садов и школ для снижения летней "
        "нагрузки на систему кондиционирования.",
        "Экология",
        6,
        InitiativeStatus.draft,
        False,
    ),
    (
        "Служба одного окна для НКО",
        "Единая точка регистрации, отчётности и подачи заявок на гранты для "
        "некоммерческих организаций региона.",
        "Бизнес-среда",
        7,
        InitiativeStatus.in_review,
        False,
    ),
    (
        "Цифровая карта доступности среды",
        "Краудсорсинговая карта пандусов, тактильной плитки и доступных входов, "
        "которую могут дополнять сами жители на колясках.",
        "Городская среда",
        2,
        InitiativeStatus.recommended,
        True,
    ),
    (
        "Программа стажировок для студентов ссузов",
        "Оплачиваемые стажировки на градообразующих предприятиях с 70%-й "
        "конверсией в постоянное трудоустройство по итогам прошлого года.",
        "Кадры и занятость",
        0,
        InitiativeStatus.in_review,
        True,
    ),
]


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
        region_list = list(region_map.values())

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
            for title, description, sphere, region_idx, status, pre_score in INITIATIVES:
                initiative = Initiative(
                    title=title,
                    description=description,
                    sphere=sphere,
                    status=status,
                    region_id=region_list[region_idx].id,
                    author_id=admin.id,
                )
                db.add(initiative)
                await db.flush()  # populate initiative.id before referencing it below

                db.add(
                    AuditLog(
                        actor_id=admin.id,
                        action="create",
                        entity_type="initiative",
                        entity_id=initiative.id,
                        detail="seed",
                    )
                )

                if pre_score:
                    result = heuristic_score(title, description, sphere)
                    initiative.kpi_score = result.kpi_score
                    initiative.ai_summary = result.ai_summary
                    initiative.score_factors = [asdict(f) for f in result.factors]
                    db.add(
                        AuditLog(
                            actor_id=admin.id,
                            action="score",
                            entity_type="initiative",
                            entity_id=initiative.id,
                            detail=f"provider={result.provider}, kpi_score={result.kpi_score}",
                        )
                    )

        await db.commit()
    print(
        f"seed: ok — {len(REGIONS)} regions, {len(INITIATIVES)} initiatives "
        "(admin@rit.dev / ChangeMe123! — смени пароль перед реальным использованием)"
    )


if __name__ == "__main__":
    asyncio.run(seed())
