using CSMS.Dto.DriversDto;
using CSMS.ViewModel;

namespace CSMS.service.Driver_serv
{
    public interface IDriverService
    {
        Task<PagedViewModel<DriverViewModel>> GetDriversAsync(DriverListQueryDto query);
        Task<DriverViewModel?> GetMeAsync(string userId);
        Task<DriverLocationResult> UpdateLocationAsync(string userId, UpdateDriverLocationDto dto);
        Task<DriverPhoneResult> UpdatePhoneByEmailAsync(UpdateDriverPhoneDto dto);
        Task<DriverAdminUpdateResult> UpdateAdminFieldsAsync(int driverId, UpdateDriverAdminDto dto);

    }
        
}
