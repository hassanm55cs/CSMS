using CSMS.Dto;
using CSMS.ViewModel;

namespace CSMS.service.Rental_serv
{
    public interface IRentalCarService
    {
        Task<PagedViewModel<RentalCarListItemViewModel>> GetRentalCarsAsync(RentalCarListQueryDto query);
        Task<RentalCarDetailsViewModel?> GetRentalCarAsync(string licencePlate,RentalCarAvailabilityQueryDto query);
        Task<RentalCarCreateResult> CreateAsync(CreateRentalCarDto dto);
        Task<RentalCarUpdateResult> UpdateAsync(string licencePlate, UpdateRentalCarDto dto);
        Task<RentalCarDeleteStatus> DeleteAsync(string licencePlate);
    }
}
