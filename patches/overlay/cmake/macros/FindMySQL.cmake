#
# Find the MySQL / MariaDB client includes and library
#
# LegionForge overlay: the upstream module only looked for a system-wide
# "MySQL Server 5.x" installation and the import library name "libmysql".
# This project uses the portable MariaDB Server archive, which ships:
#
#   tools/mariadb/include/mysql/mysql.h
#   tools/mariadb/lib/libmariadb.lib (+ libmariadb.dll)
#   tools/mariadb/lib/mariadbclient.lib (static client library)
#
# The client library is API/ABI compatible with libmysql, so we simply accept
# all naming schemes. Search order:
#   1. Values provided on the command line (-DMYSQL_LIBRARY=... etc.)
#   2. CMAKE_PREFIX_PATH (normal find_* behaviour)
#   3. Legacy hard-coded MySQL Server install paths (kept for compatibility)
#
# This module defines
#   MYSQL_INCLUDE_DIR   where to find mysql.h
#   MYSQL_LIBRARY       the import library to link against
#   MYSQL_LIBRARIES     alias of MYSQL_LIBRARY (+ extra libs)
#   MYSQL_EXTRA_LIBRARIES additional libraries required on UNIX
#   MYSQL_EXECUTABLE    the mysql/mariadb command line client (optional)
#   MYSQL_FOUND         true when both headers and library were located
#

set(MYSQL_FOUND 0)

# Accepted library names, MariaDB client libraries first (shipped by tools/mariadb).
set(_MYSQL_LIB_NAMES
  libmariadb mariadb mariadbclient
  libmysql mysqlclient mysqlclient_r mysql
)

if(UNIX)
  set(MYSQL_CONFIG_PREFER_PATH "$ENV{MYSQL_HOME}/bin" CACHE FILEPATH
    "preferred path to MySQL (mysql_config)")

  find_program(MYSQL_CONFIG
    NAMES mariadb_config mysql_config
    PATHS
      ${MYSQL_CONFIG_PREFER_PATH}
      /usr/local/mysql/bin/
      /usr/local/bin/
      /usr/bin/
  )

  if(MYSQL_CONFIG)
    message(STATUS "Using mysql-config: ${MYSQL_CONFIG}")

    execute_process(
      COMMAND "${MYSQL_CONFIG}" --include
      OUTPUT_VARIABLE MY_TMP
      OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    string(REGEX REPLACE "-I([^ ]*)( .*)?" "\\1" MY_TMP "${MY_TMP}")
    set(MYSQL_ADD_INCLUDE_PATH ${MY_TMP} CACHE FILEPATH INTERNAL)

    execute_process(
      COMMAND "${MYSQL_CONFIG}" --libs_r
      OUTPUT_VARIABLE MY_TMP
      OUTPUT_STRIP_TRAILING_WHITESPACE
    )

    set(MYSQL_ADD_LIBRARIES "")
    string(REGEX MATCHALL "-l[^ ]*" MYSQL_LIB_LIST "${MY_TMP}")
    foreach(LIB ${MYSQL_LIB_LIST})
      string(REGEX REPLACE "[ ]*-l([^ ]*)" "\\1" LIB "${LIB}")
      list(APPEND MYSQL_ADD_LIBRARIES "${LIB}")
    endforeach()

    set(MYSQL_ADD_LIBRARIES_PATH "")
    string(REGEX MATCHALL "-L[^ ]*" MYSQL_LIBDIR_LIST "${MY_TMP}")
    foreach(LIB ${MYSQL_LIBDIR_LIST})
      string(REGEX REPLACE "[ ]*-L([^ ]*)" "\\1" LIB "${LIB}")
      list(APPEND MYSQL_ADD_LIBRARIES_PATH "${LIB}")
    endforeach()
  endif()
endif()

if(WIN32)
  set(PROGRAM_FILES_32 $ENV{ProgramFiles})
  if(PROGRAM_FILES_32)
    string(REPLACE "\\" "/" PROGRAM_FILES_32 "${PROGRAM_FILES_32}")
  endif()

  set(PROGRAM_FILES_64 $ENV{ProgramW6432})
  if(PROGRAM_FILES_64)
    string(REPLACE "\\" "/" PROGRAM_FILES_64 "${PROGRAM_FILES_64}")
  endif()
endif()

# ---------------------------------------------------------------------------
# Headers. PATH_SUFFIXES covers the portable layout (include/mysql/mysql.h).
# ---------------------------------------------------------------------------
find_path(MYSQL_INCLUDE_DIR
  NAMES
    mysql.h
  PATH_SUFFIXES
    mysql
    mariadb
  PATHS
    ${MYSQL_ADD_INCLUDE_PATH}
    /usr/include
    /usr/include/mysql
    /usr/local/include
    /usr/local/include/mysql
    /usr/local/mysql/include
    "${PROGRAM_FILES_64}/MySQL/MySQL Server 5.7/include"
    "${PROGRAM_FILES_64}/MySQL/MySQL Server 5.6/include"
    "${PROGRAM_FILES_64}/MySQL/include"
    "${PROGRAM_FILES_32}/MySQL/MySQL Server 5.7/include"
    "${PROGRAM_FILES_32}/MySQL/MySQL Server 5.6/include"
    "${PROGRAM_FILES_32}/MySQL/include"
    "C:/MySQL/include"
    "$ENV{MYSQL_ROOT}/include"
  DOC
    "Specify the directory containing mysql.h."
)

# ---------------------------------------------------------------------------
# Import library.
# ---------------------------------------------------------------------------
find_library(MYSQL_LIBRARY
  NAMES
    ${MYSQL_ADD_LIBRARIES}
    ${_MYSQL_LIB_NAMES}
  PATHS
    ${MYSQL_ADD_LIBRARIES_PATH}
    /usr/lib
    /usr/lib/mysql
    /usr/local/lib
    /usr/local/lib/mysql
    /usr/local/mysql/lib
    "${PROGRAM_FILES_64}/MySQL/MySQL Server 5.7/lib"
    "${PROGRAM_FILES_64}/MySQL/MySQL Server 5.6/lib"
    "${PROGRAM_FILES_64}/MySQL/MySQL Server 5.7/lib/opt"
    "${PROGRAM_FILES_64}/MySQL/lib"
    "${PROGRAM_FILES_32}/MySQL/MySQL Server 5.7/lib"
    "${PROGRAM_FILES_32}/MySQL/MySQL Server 5.6/lib"
    "${PROGRAM_FILES_32}/MySQL/MySQL Server 5.7/lib/opt"
    "${PROGRAM_FILES_32}/MySQL/lib"
    "C:/MySQL/lib/debug"
    "$ENV{MYSQL_ROOT}/lib"
  DOC "Specify the location of the mysql/mariadb client library here."
)

if(NOT WIN32)
  find_library(MYSQL_EXTRA_LIBRARIES
    NAMES z zlib
    PATHS /usr/lib /usr/local/lib
    DOC "Additional libraries required to link a MySQL client (typically zlib)."
  )
else()
  set(MYSQL_EXTRA_LIBRARIES "")
endif()

find_program(MYSQL_EXECUTABLE
  NAMES
    mysql mariadb
  PATHS
    ${MYSQL_CONFIG_PREFER_PATH}
    /usr/local/mysql/bin/
    /usr/local/bin/
    /usr/bin/
    "${PROGRAM_FILES_64}/MySQL/MySQL Server 5.7/bin"
    "${PROGRAM_FILES_64}/MySQL/MySQL Server 5.6/bin"
    "${PROGRAM_FILES_64}/MySQL/bin"
    "${PROGRAM_FILES_32}/MySQL/MySQL Server 5.7/bin"
    "${PROGRAM_FILES_32}/MySQL/MySQL Server 5.6/bin"
    "${PROGRAM_FILES_32}/MySQL/bin"
    "$ENV{MYSQL_ROOT}/bin"
  DOC
    "Path to your mysql/mariadb client binary."
)

if(MYSQL_LIBRARY)
  if(MYSQL_INCLUDE_DIR)
    set(MYSQL_FOUND 1)
    set(MYSQL_LIBRARIES ${MYSQL_LIBRARY} ${MYSQL_EXTRA_LIBRARIES})
    message(STATUS "Found MySQL/MariaDB library: ${MYSQL_LIBRARY}")
    message(STATUS "Found MySQL/MariaDB headers: ${MYSQL_INCLUDE_DIR}")
    if(MYSQL_EXECUTABLE)
      message(STATUS "Found MySQL/MariaDB executable: ${MYSQL_EXECUTABLE}")
    endif()
    mark_as_advanced(MYSQL_FOUND MYSQL_LIBRARY MYSQL_LIBRARIES
                     MYSQL_EXTRA_LIBRARIES MYSQL_INCLUDE_DIR MYSQL_EXECUTABLE)
  else()
    message(FATAL_ERROR
      "Could not find MySQL/MariaDB headers (mysql.h). "
      "Expected the portable tree at tools/mariadb/include/mysql.")
  endif()
else()
  message(FATAL_ERROR
    "Could not find the MySQL/MariaDB client library. "
    "Expected tools/mariadb/lib/libmariadb.lib "
    "(run START.bat so portable MariaDB is extracted).")
endif()
