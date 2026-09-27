# Runtime (generated)

После первого запуска bootstrap здесь создаются:

- `runtime/database` — автономная MariaDB и статус bootstrap;
- `runtime/logs` — журналы MariaDB и серверных процессов;
- `runtime/backups` — резервные копии;
- `server/runtime` — установленные бинарники ядра.

Не добавляйте в Git базы, логи, скомпилированные exe-файлы и секреты.
