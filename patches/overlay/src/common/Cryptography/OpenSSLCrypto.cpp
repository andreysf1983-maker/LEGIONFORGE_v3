/*
 * LegionForge compatibility overlay for LegionCore-7.3.5V2
 *
 * The upstream file uses the OpenSSL 1.0 threading API:
 *   CRYPTO_LOCK, CRYPTO_THREADID, CRYPTO_num_locks,
 *   CRYPTO_set_locking_callback and CRYPTO_THREADID_set_callback.
 * Those APIs were removed in OpenSSL 1.1.0. OpenSSL 1.1/3.x performs its
 * internal locking itself, so the callbacks must not be compiled there.
 */
#include <OpenSSLCrypto.h>
#include <openssl/crypto.h>
#include <openssl/opensslv.h>

#if OPENSSL_VERSION_NUMBER < 0x10100000L

#include <vector>
#include <thread>
#include <mutex>

std::vector<std::mutex*> cryptoLocks;

static void lockingCallback(int mode, int type, const char* /*file*/, int /*line*/)
{
    if (mode & CRYPTO_LOCK)
        cryptoLocks[type]->lock();
    else
        cryptoLocks[type]->unlock();
}

static void threadIdCallback(CRYPTO_THREADID* id)
{
    (void)id;
    CRYPTO_THREADID_set_numeric(id, std::hash<std::thread::id>()(std::this_thread::get_id()));
}

void OpenSSLCrypto::threadsSetup()
{
    cryptoLocks.resize(CRYPTO_num_locks());
    for (int i = 0; i < CRYPTO_num_locks(); ++i)
        cryptoLocks[i] = new std::mutex();

    CRYPTO_THREADID_set_callback(threadIdCallback);
    CRYPTO_set_locking_callback(lockingCallback);
}

void OpenSSLCrypto::threadsCleanup()
{
    CRYPTO_set_locking_callback(nullptr);
    CRYPTO_THREADID_set_callback(nullptr);
    for (std::mutex* lock : cryptoLocks)
        delete lock;
    cryptoLocks.clear();
}

#else

// OpenSSL >= 1.1.0 owns its internal thread-safety primitives. Keeping these
// functions as no-ops preserves the LegionCore public API without referencing
// removed symbols and is valid for OpenSSL 1.1.x, 3.x and 4.x.
void OpenSSLCrypto::threadsSetup()
{
}

void OpenSSLCrypto::threadsCleanup()
{
}

#endif
