using CSMS.Dto;
using CSMS.Dto.Common;
using CSMS.Dto.DriversDto;
using CSMS.ViewModel;
using MimeKit.Tnef;
using static CSMS.service.Adminserv.AdminService;

namespace CSMS.service.Adminserv
{
  
    public interface IAdminService
    {
        Task<IReadOnlyList<BranchReportRowViewModel>> GetBranchReportAsync(AdminDateRangeQueryDto query);
      
        Task<List<RevenueRow>> LoadRevenueRowsAsync(DateOnly from, DateOnly to, int? branchId);
         Task<FleetUtilizationViewModel> GetFleetUtilizationAsync();
        Task<IReadOnlyList<RevenueReportRowViewModel>> GetRevenueReportAsync(RevenueReportQueryDto query);
       Task<AdminDashboardViewModel> GetDashboardAsync(AdminDashboardQueryDto query);
        Task<PagedViewModel<AdminEmergencyRequestListItemViewModel>> GetEmergencyRequestsAsync(EmergencyRequestListQueryDto query);
        Task<EmergencyRequestViewModel?> GetRequestsDetailsAsync(int emergencyId);
    }
}
