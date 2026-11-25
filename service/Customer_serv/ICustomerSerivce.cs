using CSMS.Dto.CustomerDto;

namespace CSMS.service.Customer_serv
{
    public interface ICustomerSerivce
    {
        Task<(bool success, string[] errors)> DeleteCustomerAsync(string userId);
    }
}
