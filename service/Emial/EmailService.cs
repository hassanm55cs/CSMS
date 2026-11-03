using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;


namespace CSMS.service.Emial
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<bool> SendEmailAsync(
            string to,
            string subject,
            string body)
        {
            try
            {
                var email = new MimeMessage();

                email.From.Add(MailboxAddress.Parse(
                    _configuration["EmailSettings:From"]!));

                email.To.Add(MailboxAddress.Parse(to));
                email.Subject = subject;

                email.Body = new BodyBuilder
                {
                    HtmlBody = body
                }.ToMessageBody();

                using var smtp = new SmtpClient();

                await smtp.ConnectAsync(
                    "smtp.gmail.com",
                    587,
                    SecureSocketOptions.StartTls);

                await smtp.AuthenticateAsync(
                    _configuration["EmailSettings:Username"],
                    _configuration["EmailSettings:Password"]);

                await smtp.SendAsync(email);

                await smtp.DisconnectAsync(true);

                return true;
            }
            catch (Exception ex)
            {
                // Log the exception
                Console.WriteLine(ex.Message);

                return false;
            }
        }
    }
}
