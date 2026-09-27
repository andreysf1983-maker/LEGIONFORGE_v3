/*
 * LegionForge compatibility overlay for LegionCore-7.3.5V2
 *
 * The upstream AsioHacksFwd.h predeclares old Boost.Asio service types:
 *   - deadline_timer_service
 *   - resolver_service
 *   - deadline_timer typedef based on those services
 * and relies on hand-written forward declarations to reduce compile time.
 *
 * That approach breaks modern Boost.Asio (including 1.86.0), where these
 * classes became aliases/templates over executor-aware implementations and
 * conflict with the real definitions from <boost/asio/...>.
 *
 * For modern Boost we stop faking Asio types and include the canonical
 * headers instead. Only Trinity::AsioStrand remains forward-declared.
 */

#ifndef AsioHacksFwd_h__
#define AsioHacksFwd_h__

#include <boost/version.hpp>

#if BOOST_VERSION >= 107000

#include <boost/asio/io_service.hpp>
#include <boost/asio/deadline_timer.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/ip/address.hpp>
#include <boost/system/error_code.hpp>

#else

namespace boost
{
    namespace posix_time
    {
        class ptime;
    }

    namespace asio
    {
        namespace ip
        {
            class address;
            class tcp;

            template <typename InternetProtocol>
            class basic_endpoint;

            typedef basic_endpoint<tcp> tcp_endpoint;

            template <typename InternetProtocol>
            class resolver_service;

            template <typename InternetProtocol, typename ResolverService>
            class basic_resolver;

            typedef basic_resolver<tcp, resolver_service<tcp>> tcp_resolver;
        }

        class io_service;

        template <typename Time>
        struct time_traits;

        template <typename TimeType, typename TimeTraits>
        class deadline_timer_service;

        template <typename Time, typename TimeTraits, typename TimerService>
        class basic_deadline_timer;

        typedef basic_deadline_timer<posix_time::ptime, time_traits<posix_time::ptime>, deadline_timer_service<posix_time::ptime, time_traits<posix_time::ptime>>> deadline_timer;
    }

    namespace system
    {
        class error_code;
    }
}

#endif

namespace Trinity
{
    class AsioStrand;
}

#endif // AsioHacksFwd_h__
