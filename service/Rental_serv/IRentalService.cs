using CSMS.Dto;
using CSMS.ViewModel;

namespace CSMS.service.Rental_serv
{
    public interface IRentalService
    {
        Task<RentalCreateResult> CreateRentalAsync(string userId, CreateRentalDto dto);
        Task<PagedViewModel<RentalViewModel>?> GetMyRentalsAsync(string userId,RentalListQueryDto query);
        Task<RentalDetailsViewModel?> GetRentalAsync( int rentedCarCustomerId,string userId,bool hasStaffAccess);
       Task<RentalCancelResult> CancelRentalAsync(string userId,bool isAdmin,string? reason);
    }
}
