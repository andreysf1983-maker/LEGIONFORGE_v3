# Патчи upstream-ядра

Автоматически применяется только содержимое папки `patches/overlay`.

Сохраняйте внутри неё структуру путей относительно `server/source`. Например, файл:

`patches/overlay/src/server/scripts/Custom/MyFeature.cpp`

будет скопирован в:

`server/source/src/server/scripts/Custom/MyFeature.cpp`

Bootstrap использует `robocopy /XO`: он не удаляет существующие upstream-файлы и не выполняет `git reset`. Изменения, требующие правок одного и того же upstream-файла, должны оформляться как отдельный проверяемый patch-файл и документироваться до применения, а не заменять файл целиком.
