namespace CSMS.service.Emial
{
    public interface IEmailService
    {
        Task <bool>SendEmailAsync(
       string to,
       string subject,
       string body);
    }
}
