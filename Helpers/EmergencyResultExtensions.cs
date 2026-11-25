using CSMS.service.Emergency_serv;
using CSMS.ViewModel;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Helper;

public static class EmergencyResultExtensions
{
    // One place that turns service results into HTTP responses, shared by every SOS controller.
    public static IActionResult ToActionResult(
        this EmergencyResult result,
        ControllerBase controller,
        Func<EmergencyRequestViewModel, IActionResult> onSuccess)
    {
        return result.Status switch
        {
            EmergencyResultStatus.Success => onSuccess(result.Request!),
            EmergencyResultStatus.NotFound => controller.NotFound(),
            EmergencyResultStatus.Forbidden => controller.Forbid(),

            EmergencyResultStatus.CustomerNotFound => controller.NotFound(
                new { Message = "Customer profile not found." }),
            EmergencyResultStatus.CarNotFound => controller.NotFound(
                new { Message = "Car not found for this customer." }),
            EmergencyResultStatus.DriverNotFound => controller.NotFound(
                new { Message = "Driver not found." }),
            EmergencyResultStatus.TruckNotFound => controller.NotFound(
                new { Message = "Emergency truck not found." }),

            EmergencyResultStatus.InvalidProblemType => controller.BadRequest(
                new { Message = "Unknown problem type. Use GET /api/v1/sos/problem-types for the valid ids." }),
            EmergencyResultStatus.InvalidCoordinates => controller.BadRequest(
                new { Message = "Latitude must be between -90 and 90, longitude between -180 and 180, and both must be sent together." }),
            EmergencyResultStatus.InvalidStatus => controller.BadRequest(
                new { Message = "Status must be one of: OnTheWay, Arrived, Completed." }),
            EmergencyResultStatus.BranchMismatch => controller.BadRequest(
                new { Message = "The driver and the truck must belong to the same branch." }),

            EmergencyResultStatus.DuplicateActiveRequest => controller.Conflict(
                new { Message = "This car already has an active emergency request." }),
            EmergencyResultStatus.InvalidTransition => controller.Conflict(
                new { Message = "Invalid status change. The flow is Requested -> Assigned -> OnTheWay -> Arrived -> Completed." }),
            EmergencyResultStatus.NotAssignable => controller.Conflict(
                new { Message = "This request can no longer be assigned or accepted." }),
            EmergencyResultStatus.AlreadyClosed => controller.Conflict(
                new { Message = "This request is already completed or cancelled." }),
            EmergencyResultStatus.DriverUnavailable => controller.Conflict(
                new { Message = "The driver is not available." }),
            EmergencyResultStatus.TruckUnavailable => controller.Conflict(
                new { Message = "The truck is not available." }),
            EmergencyResultStatus.Conflict => controller.Conflict(
                new { Message = "The request was changed by someone else. Reload it and try again." }),

            _ => controller.StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
