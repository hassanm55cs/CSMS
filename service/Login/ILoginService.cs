using CSMS.Dto;

namespace CSMS.service.Login
{
    public interface ILoginService
    {
        Task<(bool succsee,string error, string Token )> LoginAsync(LoginDto dto);
    }
}
