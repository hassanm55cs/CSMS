using CSMS.Dto.ServiceSchedule;

namespace CSMS.service.ServiceSchedule
{
    public interface IServiceScheduleService
    {
        Task<List<ServiceScheduleResponseDto>> GetAllAsync();
        Task<ServiceScheduleResponseDto> CreateAsync(ServiceScheduleRequestDto dto);
        Task<ServiceScheduleResponseDto?> UpdateAsync(int serviceByKmId, ServiceScheduleRequestDto dto);
        Task<bool> DeleteAsync(int serviceByKmId);
    }
}
