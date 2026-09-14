# Norvayne Telegram Mini App — static version

Эта версия не использует React, Vite, npm или сборку.

## Проверка на компьютере
Просто откройте `index.html` двойным кликом. Карта, календарь, города и страны должны работать через `file://`.

## Vercel
Загрузите содержимое этой папки в корень GitHub-репозитория. В Vercel проект можно развернуть как обычный статический сайт — Build Command не нужен.

Основные файлы:
- `index.html`
- `styles.css`
- `app.js`
- `data/world-data.js`
- `assets/Qoquekiac-raster.webp`


## Календарь
Встроен пользовательский календарь из calendar.json: 394 дня, месяцы Ikhael / Ireul / Jeha / Amel, 7 дней недели, 3 луны и заметки по датам.

## Bot /start setup

1. In Vercel → Settings → Environment Variables add `TELEGRAM_BOT_TOKEN` with the token from BotFather.
2. Optional: add `MINI_APP_URL=https://norvayne.vercel.app/` and `WEBHOOK_URL=https://norvayne.vercel.app/api/telegram` (these values are already defaults in the code).
3. Redeploy the project.
4. Open `https://norvayne.vercel.app/api/telegram` once. You should see `{ "ok": true, ... }`.
5. Open `@Norvayne_bot` in Telegram and press Start. The bot sends three Mini App buttons in this order: `👤 Персонаж`, `🗺 Карта`, `📅 Календарь`. Each button opens the corresponding tab directly.

### Important fix in this build
The webhook now waits for Telegram `sendMessage` to finish before the Vercel function returns. This avoids losing the `/start` response when the serverless function is frozen immediately after sending HTTP 200.

After deploying, open `https://norvayne.vercel.app/api/telegram` once and verify that the JSON contains `"ok": true` and `webhook_info.url` equals `https://norvayne.vercel.app/api/telegram`.

## Telegram-персонажи

Приложение теперь определяет пользователя через Telegram Mini App и показывает его профиль/аватар и только привязанного персонажа.

1. Откройте `data/players.json`.
2. Для каждого персонажа заполните `telegramUsername` без `@` (например `player_name`). Для более надежной привязки можно также заполнить `telegramId` — цифровой ID Telegram имеет приоритет над ником.
3. В `character.equipment` добавляйте группы снаряжения, например:

```json
{
  "category": "Оружие",
  "items": [
    {"name": "Длинный меч", "quantity": 1, "note": "+1", "equipped": true}
  ]
}
```

Проверка пользователя выполняется на сервере в `/api/player.js` через `Telegram.WebApp.initData` и переменную Vercel `TELEGRAM_BOT_TOKEN`.

## Лист персонажа SWADE

Во вкладке «Персонаж» добавлен компактный интерактивный лист:
- характеристики SWADE: ловкость, смекалка, характер, сила, выносливость;
- навыки (5 базовых уже есть, остальные можно добавлять из списка);
- шаг, защита, стойкость, ранения, усталость и фишки;
- черты и изъяны;
- интерактивное снаряжение и каталог из `data/swade-equipment.js`;
- расчёт веса/нагрузки, брони, защиты и стойкости с учётом надетых вещей;
- кошелёк Орлов и Сикелей и калькулятор курса 1 Сикель = 2 Орла.

Каталог снаряжения хранит характеристики из таблиц SWADE: цену, вес, минимальную силу, урон, бронебойность, дистанцию, скорострельность, боезапас, броню, защиту, укрытие и примечания — в зависимости от типа предмета. Цены каталога показываются как базовые цены SWADE (`$`) и не списываются автоматически из внутриигрового кошелька Norvayne.

Лист, снаряжение и деньги сохраняются в локальный кеш, Telegram CloudStorage и дополнительно зеркалируются в общее серверное хранилище. Общее хранилище нужно для панели Мастера и является дополнительной страховкой синхронизации между телефоном и компьютером.

## Общее хранилище и панель Мастера

В `data/players.json` игрок Велизарий теперь привязан к `@oOHodorOo`, а `@SokolBGA` является отдельным пользователем с ролью `admin`/«Мастер». У Мастера нет собственного листа персонажа: вместо него открывается панель только для просмотра денег и снаряжения всех игроков.

Чтобы панель Мастера видела данные других Telegram-пользователей, на Vercel нужно подключить Upstash Redis (через Marketplace/Integration) и получить REST-переменные окружения. Код поддерживает оба стандартных набора имён:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`;
- либо `KV_REST_API_URL` + `KV_REST_API_TOKEN`.

После добавления переменных сделайте Redeploy. Секреты нельзя добавлять в репозиторий.

Каждый игрок при открытии новой версии автоматически отправляет актуальные `sheet`, `inventory` и `money` в общее хранилище. Поэтому после первого деплоя всем игрокам достаточно один раз открыть вкладку «Персонаж».

Для перехода Велизария со старого аккаунта `@SokolBGA` на `@oOHodorOo` предусмотрена миграция: когда `@SokolBGA` впервые откроет новую версию уже как Мастер, приложение попробует перенести старые облачные данные Велизария из его Telegram CloudStorage в общее хранилище, но не перезапишет более свежие данные.

## Общая казна
В листе персонажа есть общий баланс группы (Орлы и Сикели). Он хранится в общем Upstash Redis, поэтому изменение любого игрока видно остальным. Открытые приложения обновляют казну автоматически примерно раз в 4 секунды и при возвращении в приложение. Мастер видит общий баланс в своей панели, но не редактирует его.

## UX update: combat, transfers and shared notes

This build adds:
- shared combat-state controls (wounds, fatigue, bennies, Shaken, Distracted, Vulnerable);
- GM read-only visibility of every player's combat state;
- player-to-player transfers of personal money and inventory;
- live receiving of transferred money/items while the Mini App is open;
- shared group notes stored in Upstash Redis;
- a collapsible currency calculator;
- responsive/mobile layout and touch-target polish.

The new shared features use the same Upstash Redis environment variables as the shared treasury:
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` + `KV_REST_API_TOKEN`).


## Full character portraits
Click/tap a character avatar to open the full character artwork. The viewer closes with the × button, by tapping the dark backdrop, or with Escape. Portrait assets are stored in `assets/portraits/`.
