using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace CSMS.Helper;

public static class ConcurrencyExceptionHelper
{
    /// <summary>
    /// Detects EF Core concurrency/update conflicts and SQL Server deadlocks or unique constraint violations,
    /// including when SqlServerExecutionStrategy wraps them inside an InvalidOperationException.
    /// </summary>
    public static bool IsConcurrencyOrDeadlock(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is DbUpdateConcurrencyException or DbUpdateException)
            {
                return true;
            }

            if (current is SqlException sqlEx && sqlEx.Number is 1205 or 2601 or 2627)
            {
                return true;
            }
        }

        return false;
    }
}
