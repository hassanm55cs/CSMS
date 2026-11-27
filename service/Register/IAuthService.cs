using CSMS.Dto.AuthDto;
using CSMS.Dto.DriversDto;
using CSMS.Dto.EmployeeDto;

namespace CSMS.service.Register
{
      
    public interface IAuthService
    {
        Task<(bool Success, string[] Errors, int? CustomerId, string? UserId)> RegisterCustomerAsync(RegisterDto dto);
        Task<(bool Success, string[] Errors, int? DriverId, string? UserId, string? DefaultPassword)> AddDriver(DriverDto driverdto, string? adminUserId = null);
         Task<(bool Success, string[] Errors, int? CustomerId, string? UserId, string? Token)> RegisterEmployeeAsync(EmployeeDto dto);
    }
   

    }

