# RIT — Regional Initiatives Tracker

**Трекер региональных инициатив.** Каталог, рейтинг и AI-предварительный отбор
практик — учебный проект, вдохновлённый тем, как устроены открытые платформы
для сбора и оценки региональных инициатив и практик.

[![CI](https://github.com/subrosa5/RIT/actions/workflows/ci.yml/badge.svg)](https://github.com/subrosa5/RIT/actions/workflows/ci.yml)
[![Security](https://github.com/subrosa5/RIT/actions/workflows/security.yml/badge.svg)](https://github.com/subrosa5/RIT/actions/workflows/security.yml)

**Демо:** [rit-web-sigma.vercel.app](https://rit-web-sigma.vercel.app) ·
**API health-check:** [rit-api.vercel.app/healthz](https://rit-api.vercel.app/healthz)
(тестовый вход: `admin@rit.dev` / `ChangeMe123!`)

> Интерактивная документация API (`/docs`) в проде намеренно отключена
> (`docs_url=None` при `ENVIRONMENT=production`) — не выставлять схему API
> публично считается хорошей практикой. Открыть её можно только локально,
> запустив бэкенд с `ENVIRONMENT=development` (значение по умолчанию).

## Проблема

Открытые платформы для сбора инициатив и практик почти всегда масштабируются
асимметрично: подать заявку может кто угодно, а прочитать и оценить её —
только эксперт с профильной компетенцией. Заявок в итоге всегда больше,
чем экспертных часов на их разбор.

Механика проста и от конкретной платформы не зависит. При 1000 заявках
и 5 минутах на прочтение и первичное решение по каждой — это больше
80 часов работы до того, как эксперт дойдёт до содержательной оценки хоть
одной идеи. Причём заметная часть этого времени уходит не на суть, а на
рутину: отсеять формально слабые заявки, заметить очевидные дубли,
сгруппировать похожее по теме.

## Гипотеза

Именно эта рутинная часть — предварительный балл по понятным критериям и
поиск дублей по смыслу — поддаётся автоматизации без риска подменить
экспертизу: критерии прозрачны, решение остаётся за человеком, а
алгоритм только сокращает путь к содержательным заявкам.

Прототип проверяет ровно это: AI-скоринг и обнаружение похожих заявок как
первый фильтр, финальное решение — всегда за куратором. Использует ли
эту схему уже какая-то конкретная программа — я не проверял и не
утверждаю; гипотеза здесь не про чужой процесс, а про то, что подобное
узкое место закономерно возникает на таком масштабе и закономерно решается
таким способом.

## Что делает прототип

- **CRUD** над сущностью «инициатива»: регион, сфера, статус, автор, KPI-скор
- **AI-скоринг**: LLM оценивает новизну/реализуемость/влияние и пишет
  краткое summary для эксперта — с heuristic-фолбэком, если `ANTHROPIC_API_KEY`
  не задан (см. `app/services/scoring.py`)
- **Дедупликация**: лексическое сравнение с похожими заявками
  (в проде — pgvector cosine similarity)
- **Дашборд**: сводка по статусам/сферам/регионам
- **Ежедневный дайджест**: `scripts/daily_ingest.py`, запускается по cron
  через GitHub Actions, оценивает новые заявки и шлёт сводку в Telegram
- **Человек всегда финализирует решение** — AI даёт рекомендацию, не статус

## Стек

| Слой | Технологии | Почему |
|---|---|---|
| Frontend | React 18 + TypeScript (strict) + Vite + Tailwind | Быстрый HMR, типобезопасность на границе с API |
| Данные на клиенте | TanStack Query + TanStack Table | Кэш из коробки, таблицы на тысячах строк без блокировки рендера |
| Формы | React Hook Form + Zod | Zod-схемы зеркалят Pydantic-схемы бэка — граница валидируется дважды независимо |
| Backend | FastAPI (async) + Pydantic v2 | Автогенерация OpenAPI, контракт синхронен с фронтом |
| ORM/миграции | SQLAlchemy 2.0 (async) + Alembic | Параметризованные запросы по умолчанию — SQL-инъекция архитектурно исключена |
| БД | PostgreSQL (+ pgvector в проде), SQLite для dev/тестов | |
| AI | Claude API со структурированным выводом | Изолировано за одним сервисным модулем — провайдер меняется, бизнес-логика нет |

## Безопасность — что реально реализовано, не декларация

- Пароли — **argon2id** (passlib), не bcrypt/md5
- JWT access (15 мин) + refresh (7 дн) в **httpOnly + Secure + SameSite=strict** cookie, не в localStorage
- Роли проверяются **на бэкенде** в service-слое (`require_role`) — фронтовый флаг роли только для UI
- Только параметризованные запросы через SQLAlchemy — ни одной f-строки в SQL
- Security-заголовки (HSTS, CSP, X-Frame-Options, …) — одним middleware, не по маршруту вручную
- Явный CORS allow-list, без `*` при `credentials: true`
- Rate limiting на `/auth/*` (slowapi)
- Секреты — `.env` в `.gitignore`, в репозитории только `.env.example`
- **Приложение отказывается стартовать в production** с плейсхолдер-секретом,
  секретом короче 32 байт или `COOKIE_SECURE=false` (`app/core/config.py`,
  проверено тестами в `test_config.py`)
- Неизменяемый аудит-лог: кто/что/когда изменил
- CI гоняет `bandit` (SAST), `pip-audit` и `npm audit` на каждый PR и раз в неделю по расписанию
- `mypy --strict` и `ruff` — 0 замечаний на момент публикации

## Запуск локально (без Docker)

```bash
# Backend
cd apps/api
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
alembic upgrade head
python -m scripts.seed        # тестовый админ: admin@rit.dev / ChangeMe123!
uvicorn app.main:app --reload

# Frontend (в другом терминале)
cd apps/web
npm install
cp .env.example .env
npm run dev
```

Backend поднимется на `:8000`, frontend — на `:5173`.

## Запуск через Docker Compose

```bash
cd infra
cp .env.example .env   # заполнить POSTGRES_PASSWORD и JWT_SECRET_KEY
docker compose up --build
```

Frontend — `:8080`, backend — `:8000`, Postgres — `:5432`.

## Тесты

```bash
cd apps/api && pytest -q          # 15/15, sqlite in-memory, без внешних зависимостей
cd apps/web && npm run build      # typecheck (tsc -b) + production build
```

## Структура репозитория

```
RIT/
├── apps/
│   ├── web/            React + Vite + Tailwind
│   └── api/             FastAPI (routers → services → repositories)
│       ├── app/
│       ├── alembic/     версионированные миграции
│       └── scripts/     seed.py, daily_ingest.py
├── infra/
│   └── docker-compose.yml
├── .github/workflows/
│   ├── ci.yml            lint + typecheck + test + build на каждый PR
│   ├── security.yml       bandit + pip-audit + npm audit
│   └── daily-digest.yml   ежедневный cron: скоринг + Telegram-дайджест
└── .pre-commit-config.yaml
```

## Метрики (гипотетические — для демонстрации подхода)

На выборке из 3 тестовых инициатив прототип отрабатывает скоринг +
дедупликацию за секунды на heuristic-фолбэке; с реальным LLM время растёт
до нескольких секунд на заявку, что на масштабе сотен заявок в день
всё ещё на порядки быстрее ручного первичного просмотра.

## Лицензия

MIT — см. [LICENSE](LICENSE).
