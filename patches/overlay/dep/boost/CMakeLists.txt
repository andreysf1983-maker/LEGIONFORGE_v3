# LegionForge overlay: Boost resolution for LegionCore-7.3.5V2
#
# The upstream file only listed lib64-msvc-14.0/14.1 directories and aborted
# when BOOST_ROOT was missing. This project ships official prebuilt Boost
# 1.86.0 (msvc-14.3-64) portable binaries under tools/boost, so that layout
# is resolved explicitly. Static multithreaded libraries are used, matching
# the official prebuilt archives (no Boost DLLs needed at runtime).

if(WIN32)
  if(DEFINED ENV{BOOST_ROOT} AND NOT DEFINED BOOST_ROOT)
    set(BOOST_ROOT $ENV{BOOST_ROOT})
  endif()

  if(NOT BOOST_ROOT)
    message(FATAL_ERROR
      "BOOST_ROOT is not set. Run START.bat so portable Boost 1.86.0 is "
      "installed into tools/boost.")
  endif()

  if(CMAKE_CXX_COMPILER_VERSION VERSION_LESS 19.0)
    set(BOOST_LIBRARYDIR ${BOOST_ROOT}/lib${PLATFORM}-msvc-12.0)
  elseif(CMAKE_CXX_COMPILER_VERSION VERSION_LESS 19.10)
    set(BOOST_LIBRARYDIR ${BOOST_ROOT}/lib${PLATFORM}-msvc-14.0)
  else()
    list(APPEND BOOST_LIBRARYDIR
      ${BOOST_ROOT}/lib${PLATFORM}-msvc-14.3
      ${BOOST_ROOT}/lib${PLATFORM}-msvc-14.2
      ${BOOST_ROOT}/lib${PLATFORM}-msvc-14.1
      ${BOOST_ROOT}/lib${PLATFORM}-msvc-14.0)
  endif()

  set(Boost_USE_STATIC_LIBS    ON)
  set(Boost_USE_MULTITHREADED  ON)
  set(Boost_USE_STATIC_RUNTIME OFF)
endif()

find_package(Boost 1.51 REQUIRED COMPONENTS system filesystem thread program_options iostreams regex)

# Find if Boost was compiled in C++03 mode because it requires -DBOOST_NO_CXX11_SCOPED_ENUMS
include(CheckCXXSourceCompiles)

set(CMAKE_REQUIRED_INCLUDES ${Boost_INCLUDE_DIR})
set(CMAKE_REQUIRED_LIBRARIES ${Boost_SYSTEM_LIBRARY} ${Boost_FILESYSTEM_LIBRARY} ${Boost_IOSTREAMS_LIBRARY})
if(NOT MSVC)
  set(CMAKE_REQUIRED_FLAGS "-std=c++11")
endif()
unset(boost_filesystem_copy_links_without_NO_SCOPED_ENUM CACHE)
check_cxx_source_compiles("
  #include <boost/filesystem/path.hpp>
  #include <boost/filesystem/operations.hpp>
  int main() { boost::filesystem::copy_file(boost::filesystem::path(), boost::filesystem::path()); }"
boost_filesystem_copy_links_without_NO_SCOPED_ENUM)
unset(CMAKE_REQUIRED_INCLUDES CACHE)
unset(CMAKE_REQUIRED_LIBRARIES CACHE)
unset(CMAKE_REQUIRED_FLAGS CACHE)

if(NOT boost_filesystem_copy_links_without_NO_SCOPED_ENUM)
  set(OPTIONAL_BOOST_NO_SCOPED_ENUMS -DBOOST_NO_CXX11_SCOPED_ENUMS)
endif()

add_library(boost INTERFACE)

target_link_libraries(boost
  INTERFACE
    ${Boost_LIBRARIES})

target_include_directories(boost
  INTERFACE
    ${Boost_INCLUDE_DIRS})

target_compile_definitions(boost
  INTERFACE
    -DBOOST_DATE_TIME_NO_LIB
    -DBOOST_REGEX_NO_LIB
    -DBOOST_CHRONO_NO_LIB
    -DBOOST_ALL_NO_LIB
    ${OPTIONAL_BOOST_NO_SCOPED_ENUMS})

message(STATUS "Boost version: ${Boost_VERSION}")
message(STATUS "Boost include: ${Boost_INCLUDE_DIRS}")
