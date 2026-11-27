using CSMS.Dto;
using CSMS.ViewModel;

namespace CSMS.service.Emergency_serv
{
    public interface IEmergencyService
    {
        Task<EmergencyResult> CreateRequestAsync(string userId, CreateEmergencyRequestDto dto);

        Task<PagedViewModel<EmergencyRequestViewModel>> GetMyRequestsAsync(string userId, EmergencyRequestListQueryDto query);
        Task<EmergencyRequestViewModel?> GetRequestAsync(int emergencyRequestId, string userId, bool isAdmin);
        Task<EmergencyResult> AssignAsync(int emergencyRequestId, AssignEmergencyDto dto);
        Task<EmergencyResult> UpdateStatusAsync(int emergencyRequestId, string userId, bool isAdmin, UpdateEmergencyStatusDto dto);
        Task<EmergencyResult> CancelAsync(int emergencyRequestId, string userId, bool isAdmin, string? reason);
        Task<PagedViewModel<DriverEmergencyRequestViewModel>> GetDriverRequestsAsync(string userId, EmergencyRequestListQueryDto query, bool? assigned, int? branchId);
        Task<DriverEmergencyRequestViewModel?> GetDriverRequestAsync(int emergencyRequestId, string userId);
        Task<EmergencyResult> AcceptAsync(int emergencyRequestId, string userId, string? truckLicencePlate);
        Task<List<EmergencyTruckSummaryViewModel>> GetAvailableBranchTrucksAsync(string userId);
    }
}
