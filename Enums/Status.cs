using System;
using System.Collections.Generic;
using System.Text;

namespace CSMS.Enums
{
    public enum Status
    {
        Entered,
        UnderDIagnosis,
        DiagnosesSentToCustomer,
        CustomerConfirmed,
        serviceApproved,
        serviceRejected,
        InProgress,
        Completed,
        Cancelled
    }
}
