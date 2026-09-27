# LegionForge — руководство по сборке и запуску (RU)

Полное руководство по автономной сборке и запуску сервера **World of Warcraft
Legion 7.3.5.26124** на базе ядра **LegionCore-7.3.5V2**. Всё портативное
кладётся внутрь папки проекта, системный PATH не засоряется, `winget` не
используется, вывод CMD — только ASCII (кириллица в `.bat` не ломается).

---

## 1. Требования

- **ОС:** Windows 10/11 x64.
- **Компилятор:** установленная **Visual Studio 2022 или 2019** (Community/Pro/
  Enterprise/BuildTools) с компонентом **C++ (MSVC v143/v142)**. Именно она
  используется для сборки — тяжёлые установщики Build Tools не качаются.
- **~15–25 ГБ** свободного места (исходники ядра + кэш сборки + Boost + OpenSSL + MariaDB).
- Интернет для первой подготовки (архивы кэшируются в `cache/downloads`).

---

## 2. Структура папок (всё под одним корнем)

```text
START.bat                 ГЛАВНЫЙ запускатор (подготовка → сборка → запуск → панель)
START_PANEL.bat           Запуск только веб-панели
arguscore.bin.bat         Запуск панели сборки (совместимый ярлык)
project.json              Версии, пути и список зависимостей
tools/bootstrap.ps1       Вся автоматизация (Prepare/Build/Run/Panel/Stop)
Stop.bat                  Остановка всех процессов, запущенных китом
tools/setup_env.bat       Прямой вызов Prepare
tools/compile_server.bat  Прямой вызов Build
tools/run_server.bat      Прямой вызов Run

tools/                    Портативные программы (git, cmake, node, mariadb, boost, openssl)
cache/downloads/          Кэш скачанных портативных архивов
server/source/            ВАШИ исходники ядра (кладутся вручную, CMakeLists.txt в корне)
server/build/             CMake-кэш и файлы Visual Studio
server/runtime/           >>> ГОТОВАЯ СБОРКА: authserver.exe и worldserver.exe <<<
patches/overlay/          Накладной слой поверх ядра (без удаления upstream)
custom/                   Наши новые скрипты, SQL и контент
  custom/src/             Кастомные C++-скрипты (чистая дельта)
  custom/sql/             custom_database.sql, world_bosses.sql
database/import/          Проверенные upstream SQL-дампы TDB/world/auth/hotfixes
runtime/database/         Локальная MariaDB и статус bootstrap
runtime/logs/             Логи
runtime/backups/          Резервные копии
docs/                     Документация и рекламное описание
```

---

## 3. Первый запуск — что происходит

Запустите **`START.bat`** из корня проекта. Скрипт выполнит 4 шага:

1. **Prepare** — находит ваш Visual Studio, качает в `tools/` портативные
   CMake, Node.js, MariaDB, предсобранные Boost 1.86 и OpenSSL 3.5
   (без компиляции пакетов). Проверяет ваши исходники в `server/source/`
   (кит их не скачивает — положите их туда заранее), копирует встроенные
   нативные модули из `custom/src/` и накладывает `patches/overlay/`
   (оригиналы заменяемых файлов сохраняются в `runtime/backups/source-originals/`).
2. Спросит: **«Build Release x64 now? [Y/N]»** — нажмите **Y**, чтобы
   скомпилировать.
3. После сборки спросит: **«Start MariaDB, AuthServer and WorldServer now? [Y/N]»**.
4. Спросит: открыть ли **веб-панель** (Control Center).

Остановить всё запущенное (WorldServer, bnetserver/authserver, MariaDB, панель,
идущую сборку) — **`Stop.bat`** в корне проекта (`Stop.bat /force` — без ожидания).

### Куда сохраняется готовая сборка и как её запустить

Готовая сборка появляется здесь:

```text
server\runtime\authserver.exe
server\runtime\worldserver.exe
```

Запустить после компиляции можно тремя способами:

- повторно запустить **`START.bat`** (он увидит готовую сборку и сразу
  предложит запуск, шаг сборки будет пропущен);
- **`tools\run_server.bat`**;
- вручную: `server\runtime\worldserver.exe` (сначала поднимите MariaDB —
  `run_server.bat` делает это автоматически).

---

## 4. Повторный запуск

Повторный `START.bat` пропускает уже скачанные архивы и инструменты, проверяет
`server/runtime/*.exe`. Если сборка готова — сразу предлагает запустить сервер
и панель. Всё происходит за секунды.

Панель отдельно: **`START_PANEL.bat`** или **`arguscore.bin.bat`** →
откроется `http://localhost:3000` (Control Center: конфигуратор, магазин,
мировые боссы, каталог модов, база данных).

---

## 5. База данных и SQL

`run_server.bat`/`START.bat` поднимают портативную **MariaDB** на
`127.0.0.1:3307` и создают пустые базы `legion_auth`, `legion_characters`,
`legion_world`, `legion_hotfixes` (пользователь `legion`).

Порядок импорта SQL (дампы кладите в `database/import/`):

```text
1) upstream-дампы TDB (auth, characters, world, hotfixes) для сборки 26124
2) custom\sql\custom_database.sql     -- предметы, торговец, томы, реагенты
3) custom\sql\world_bosses.sql        -- 60 мировых боссов
4) battlepay_shop.sql                 -- экспорт магазина из панели (вкладка «Магазин»)
```

```bat
mariadb --host=127.0.0.1 --port=3307 -u legion -p legion_world < custom\sql\custom_database.sql
mariadb --host=127.0.0.1 --port=3307 -u legion -p legion_world < custom\sql\world_bosses.sql
```

Затем в игре от администратора: `.battlepay reload`.

---

## 6. Экономика — почему нельзя разбогатеть за день

- Валюта — **Сущности пробуждения (ID 1533)**: та же, что в Legion идёт на
  легендарки.
- Бонус за онлайн — **+50 сущностей в час** активным игрокам. За полный день
  активной игры это ~1200 сущностей.
- Цены выставлены из этого расчёта: дешёвые косметические вещи — 500–1500,
  маунты — 3000–12000, реагенты улучшения — 800/1500, тома способностей — 5000.
  За один день невозможно «скупить весь магазин»: топовые товары остаются
  целью на несколько дней игры. Менять баланс можно во вкладке **Конфигуратор**
  (размер и периодичность бонуса, темп экономики).

---

## 7. Кастомные C++-скрипты (чистая дельта)

Наши скрипты лежат в `custom/src/` и **не** пишутся в ядро автоматически — это
гарантирует, что штатная сборка всегда зелёная. Интеграция — один обратимый шаг
(см. `custom/src/README_RU.md`): скопировать файлы в `src/server/scripts/Custom/`
и вызвать `AddSC_LegionForge_Custom()`.

Оплата магазина Сущностями вместо доната — точечный патч ядра, инструкция в
`custom/src/PATCH_BattlePayEssence_RU.md`.

---

## 8. Частые проблемы

- **404 при скачивании MariaDB** — исправлено: загрузчик пробует актуальный
  путь `mariadb-<полная-версия>/…` с резервными зерками.
- **Кириллица в `.bat`** — все `.bat` используют только ASCII-вывод.
- **`winget` не найден** — не используется, всё ставится портативно в `tools/`.
- **Панель не открывается** — `arguscore.bin.bat` поднимает только портативный
  Node.js и собирает панель, не запуская тяжёлый серверный Prepare.
- **Пакетный менеджер vcpkg удалён** — зависимости больше не компилируются
  через vcpkg (это убирает целый класс сбоев: MSYS2, pkg-config, протухшие
  baseline). `START.bat` ставит напрямую: предсобранный Boost 1.86.0
  (`tools/boost`), портативный OpenSSL 3.5.8 (`tools/openssl/x64`) и
  использует клиентские файлы из портативной MariaDB (`tools/mariadb`).
  Старую папку `tools/vcpkg` можно удалить вручную.
- **`Boost installer download looks incomplete (0 MB)`** — исправлено. Это не
  Boost, а SourceForge вернул `Invoke-WebRequest` небольшую HTML-страницу вместо
  211-МБ установщика. Теперь крупный файл скачивается через `curl.exe -L` с
  пятью повторами и несколькими зеркалами SourceForge. Запускатор проверяет
  минимальный размер 150 МБ и PE-сигнатуру `MZ`; повреждённый файл в
  `cache\downloads` удаляется и перекачивается автоматически.
- **Тихая установка Boost не прошла** — запускатор сначала пробует штатный
  тихий режим установщика (лог: `runtime\logs\boost-install.log`), а при
  неудаче автоматически распаковывает его портативным `innoextract`
  (без прав администратора, лог: `runtime\logs\boost-innoextract.log`).
- **`Could not find the MySQL libraries`** — исправлено. Модуль ядра искал
  только `libmysql.lib` и системный MySQL Server. Теперь
  `patches/overlay/cmake/macros/FindMySQL.cmake` принимает имена
  `libmariadb`/`mariadbclient`/`libmysql`, а запускатор передаёт в CMake
  пути из портативной MariaDB: `-DMYSQL_INCLUDE_DIR=tools\mariadb\include\mysql`
  и `-DMYSQL_LIBRARY=tools\mariadb\lib\libmariadb.lib`. Неполный кэш прошлой
  неудачной генерации очищается автоматически.
- **Сервер не стартует из-за отсутствующих DLL** — после сборки библиотеки
  (`libmariadb.dll`, `libcrypto-3-x64.dll`, `libssl-3-x64.dll`, клиентские
  плагины MariaDB) копируются в `server\runtime` автоматически.
  Boost линкуется статически, его DLL не нужны.
- **`Cannot open include file: boost/asio/io_service.hpp`** — исправлено выбором
  версии: ядро использует устаревший API `boost::asio::io_service`/`strand`,
  а этот заголовок удалён из Boost начиная с 1.87. Проект ставит именно
  Boost 1.86.0 (последняя версия с `io_service.hpp`). Версия зафиксирована в
  `project.json` → `toolchain.dependencies.boost`.
- **`boost::asio::strand: class template requires template argument list`** —
  исходник `src/common/Logging/Log.h` использовал старый `strand` без executor,
  а `Log.cpp` вызывал удалённый `strand::wrap`. `START.bat` автоматически
  адаптирует их к Boost 1.86: тип становится
  `strand<io_service::executor_type>`, strand создаётся из `get_executor()`,
  а логирование планируется через `boost::asio::post(*strand, handler)`. Патч
  идемпотентный и проверяет каждый исходный фрагмент; если upstream поменяется,
  Prepare остановится с понятным сообщением вместо повреждения исходника.
- **`deadline_timer` / `io_service` / `resolver_service` переопределены** —
  старый `src/common/Utilities/AsioHacksFwd.h` вручную forward-declare'ил типы
  Boost.Asio и typedef'ы времён до executor-модели. В Boost 1.86 это конфликтует
  с реальными заголовками (`deadline_timer.hpp`, `io_service.hpp`) и ломает
  `RealmList`. Overlay заменяет этот файл на безопасный вариант: для Boost 1.70+
  подключаются настоящие заголовки Asio, а старые фальшивые объявления остаются
  только для древних версий Boost. Дополнительно из `RealmList.h` убран ручной
  `class boost::asio::io_service;`, который конфликтовал с настоящим typedefом.
- **`SSLEAY_VERSION` / `SSLeay_version` не объявлены** — ещё один удалённый
  API OpenSSL 1.0: функция переименована в `OpenSSL_version(OPENSSL_VERSION)`
  начиная с OpenSSL 1.1.0. Строка встречается в стартовых баннерах
  `bnetserver/Main.cpp` и `worldserver/Main.cpp`; `START.bat` заменяет её
  автоматически (идемпотентный патч с проверкой единственного вхождения).
- **`CRYPTO_LOCK` / `CRYPTO_THREADID` не объявлены** — старый
  `OpenSSLCrypto.cpp` использовал API OpenSSL 1.0, удалённый в OpenSSL 1.1 и
  3.x. Overlay `patches/overlay/src/common/Cryptography/OpenSSLCrypto.cpp`
  сохраняет callbacks только для OpenSSL 1.0, а для OpenSSL 3.5 использует
  безопасные no-op `threadsSetup/threadsCleanup`, потому что внутренняя
  многопоточность уже реализована самим OpenSSL.
- **`No BOOST_ROOT environment variable could be found`** — исправлено. Файл
  ядра `dep/boost/CMakeLists.txt` ожидал официальный установщик Boost, а
  встроенные в ядро копии `FindBoost.cmake` и `FindOpenSSL.cmake` 2016 года
  не знали современных версий. Теперь `patches/overlay/dep/boost/CMakeLists.txt`
  ищет предсобранные статические библиотеки в `tools\boost` (папка
  `lib64-msvc-14.3`), запускатор передаёт `BOOST_ROOT`/`BOOST_LIBRARYDIR` и
  `OPENSSL_ROOT_DIR`, а устаревшие Find-модули отключаются (переименовываются
  в `*.upstream.disabled` — обратимо).
- **`error C2039: "_snprintf": не является членом "std"`** — исправлено. В файле
  ядра `src/common/Common.h` стоял устаревший макрос `#define snprintf _snprintf`
  для MSVC без проверки версии. На Visual Studio 2015+ (MSVC 19.xx, включая
  VS 2022) функция `std::snprintf` является стандартной частью C++11, и
  макроподстановка превращала заголовок Boost `boost/system/detail/snprintf.hpp`
  в ошибочное `using std::_snprintf;`. Патч в `patches/overlay/src/common/Common.h`
  ограничивает макрос условием `#if _MSC_VER < 1900`, устраняя конфликт.
