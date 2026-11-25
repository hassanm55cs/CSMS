using CSMS.Dto;
using CSMS.ViewModel;

namespace CSMS.service.Truck_serv
{
    public interface IEmergencyTruckService
    {
        Task<IReadOnlyList<EmergencyTruckViewModel>> GetTrucksAsync(EmergencyTruckQueryDto query);
        Task<TruckCreateResult> CreateAsync(CreateEmergencyTruckDto dto);
        Task<TruckUpdateResult> UpdateAsync(string licencePlate, UpdateEmergencyTruckDto dto);
        Task<TruckDeleteStatus> DeleteAsync(string licencePlate);
    }
}
