using CSMS.Data;
using CSMS.Dto;
using CSMS.Models;
using CSMS.service.Emial;
using CSMS.service.Token;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace CSMS.service.Register
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ITokenService _tokenService;


        public AuthService(
         ApplicationDbContext context,
         UserManager<ApplicationUser> userManager,
         IEmailService emailService,
          IConfiguration configuration, ITokenService tokenService)
        {
            _context = context;
            _userManager = userManager;
            _emailService = emailService;
            _configuration = configuration;
            _tokenService = tokenService;
        }
        //addCustomer
        public async Task<(bool Success,string[] Errors,int? CustomerId, string? UserId)> RegisterCustomerAsync(RegisterDto dto)
        {
            // Check Identity accounts.
            if (await _userManager.FindByEmailAsync(dto.Email) != null)
            {
                return (false, new[] { "Email is already registered." },
                    null, null);
            }

            // Customer has unique email and phone constraints too.
            if (await _context.Customers.AnyAsync(c =>
                c.Email == dto.Email || c.Phone == dto.PhoneNumber))
            {
                return (false, new[]
                {
                "A customer with this email or phone already exists."
            }, null, null);
            }

            //await using var transaction =
            //    await _context.Database.BeginTransactionAsync();

            var user = new ApplicationUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber
            };
            //hash password and store in database
            var createResult =
                await _userManager.CreateAsync(user, dto.Password);

            if (!createResult.Succeeded)
            {
                return (
                    false,
                    createResult.Errors.Select(e => e.Description).ToArray(),
                    null,
                    null);
            }

            var roleResult =
                await _userManager.AddToRoleAsync(user, "customer");

            if (!roleResult.Succeeded)
            {
                return (
                    false,
                    roleResult.Errors.Select(e => e.Description).ToArray(),
                    null,
                    null);
            }

            var customer = new Customer
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.PhoneNumber,
                Address = dto.Address,
                UserId = user.Id
            };

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();
            
            return (true, Array.Empty<string>(),
                customer.CustomerId, user.Id);
        }

        
        //driver registration
        public async Task<(bool Success,string[] Errors,int? DriverId,string? UserId, string? Token)> AddDriver(DriverDto driverdto)
        {
            // Check if email is already registered in Identity
            if (await _userManager.FindByEmailAsync(driverdto.Email) != null)
            {
                return (false, new[] { "Email is already registered." }, 0, null, null);
            }

            // Check if email or phone already exists in Drivers
            if (await _context.Drivers.AnyAsync(c =>
                c.Email == driverdto.Email ||
                c.PhoneNumber == driverdto.PhoneNumber))
            {
                return (false, new[]
                {
            "A Driver with this email or phone already exists." }, 0, null, null);
            }

            var user = new ApplicationUser
            {
                UserName = driverdto.Email,
                Email = driverdto.Email,
                PhoneNumber = driverdto.PhoneNumber
            };

            var createResult = await _userManager.CreateAsync(user, driverdto.Password);

            if (!createResult.Succeeded)
            {
                return (false, createResult.Errors.Select(e => e.Description).ToArray(),  0, null,null);
            }

            var roleResult = await _userManager.AddToRoleAsync(user, "driver");

            if (!roleResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);

                return (false,  roleResult.Errors.Select(e => e.Description).ToArray(),   0, null,  null);
            }

            var driver = new Driver
            {
                FullName = driverdto.FullName,
                Email = driverdto.Email,
                PhoneNumber = driverdto.PhoneNumber,
                BranchId = driverdto.BranchId,
                Salary = driverdto.Salary,
                StartWorkDate = driverdto.StartWorkDate,
                UserId = user.Id
            };

            await _context.Drivers.AddAsync(driver);
            await _context.SaveChangesAsync();

            // Generate JWT
            var token = await _tokenService.GenerateJwtTokenAsync(user);

            // Convert JwtSecurityToken to string
            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            return (
                true,
                Array.Empty<string>(),
                driver.DriverId,
                user.Id,
                tokenString);
        }
        public async Task<(bool Success, string[] Errors, int? CustomerId, string? UserId, string? Token)> RegisterEmployeeAsync(EmployeeDto dto)
        {
            // Check Identity accounts.
            if (await _userManager.FindByEmailAsync(dto.Email) != null)
            {
                return (false, new[] { "Email is already registered." },
                    null, null, null);
            }

            // Customer has unique email and phone constraints too.
            if (await _context.Drivers.AnyAsync(c =>
                c.Email == dto.Email || c.PhoneNumber == dto.PhoneNumber))
            {
                return (false, new[]
                {
                "A customer with this email or phone already exists."
            }, null, null, null);
            }
            var branchid = await _context.ServiceBranches.FindAsync(dto.BranchId);
            if (branchid == null)
            {
                return (false, new[] { "the branch id is not exsist" }, null,null,null); 
            }
            //await using var transaction =
            //    await _context.Database.BeginTransactionAsync();

            var user = new ApplicationUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber
            };
            //hash password and store in database
            var createResult =
                await _userManager.CreateAsync(user, dto.Password);

            if (!createResult.Succeeded)
            {
                return (
                    false,
                    createResult.Errors.Select(e => e.Description).ToArray(),
                    null,
                    null,
                    null);
            }

            var roleResult =
                await _userManager.AddToRoleAsync(user, "employee");

            if (!roleResult.Succeeded)
            {
                return (
                    false,
                    roleResult.Errors.Select(e => e.Description).ToArray(),
                    null,
                    null,
                    null);
            }

            var employee = new Employee
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PhoneNumber = dto.PhoneNumber,
                BranchId = dto.BranchId,
                Facultly = dto.Facultly,
                YearsOfExperince = dto.YearsOfExperince,
                StartingWorkDate = dto.StartingWorkDate,
                Salary = dto.Salary,
                UserId = user.Id
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            var tokens = await _tokenService.GenerateJwtTokenAsync(user);
            var tokenstring = new JwtSecurityTokenHandler().WriteToken(tokens);

            return (true, Array.Empty<string>(),
                employee.EmployeeId, user.Id, tokenstring);
        }

    }
}
