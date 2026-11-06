using System;
using System.Collections.Generic;
using System.Text;

namespace CSMS.Enums
{
    public enum StatusEmergency
    {
        requested = 0,
        confirmed = 1,
        onTheWay = 2,
        arrived = 3,
        tobranch = 4,
        arrivedToBranch = 5,
        assigned = 6,
        completed = 7,
        cancelled = 8,
    }
}
