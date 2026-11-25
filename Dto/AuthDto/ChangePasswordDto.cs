using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace CSMS.Dto.AuthDto
{
    public class ChangePasswordDto
    {

        [Required]
        public string CurrentPassword { get; set; }
        [Required,MinLength(10)]
        public string NewPassword { get; set; }
        [Required]
        [Compare(nameof(NewPassword),ErrorMessage = "New password and confirmation password do not match.") ]
        public string ConfirmPassword { get; set; }
    }
}
