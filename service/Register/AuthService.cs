using CSMS.Data;
using CSMS.Dto.AuthDto;
using CSMS.Dto.DriversDto;
using CSMS.Dto.EmployeeDto;
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

        
        // Admin-created driver account with configured default password
        public async Task<(bool Success, string[] Errors, int? DriverId, string? UserId, string? DefaultPassword)> AddDriver(DriverDto driverdto, string? adminUserId = null)
        {
            var email = driverdto.Email.Trim();
            var phone = driverdto.PhoneNumber.Trim();
            var fullName = driverdto.FullName.Trim();

            if (!await _context.ServiceBranches.AnyAsync(b => b.BranchId == driverdto.BranchId))
            {
                return (false, new[] { "The selected branch does not exist." }, 0, null, null);
            }

            // Check if email is already registered in Identity
            if (await _userManager.FindByEmailAsync(email) != null)
            {
                return (false, new[] { "Email is already registered." }, 0, null, null);
            }

            // Check if email or phone already exists in Drivers
            if (await _context.Drivers.AnyAsync(c =>
                c.Email == email ||
                c.PhoneNumber == phone))
            {
                return (false, new[]
                {
                    "A driver with this email or phone already exists."
                }, 0, null, null);
            }

            var defaultPassword = _configuration["DriverSettings:DefaultPassword"];
            if (string.IsNullOrWhiteSpace(defaultPassword))
            {
                defaultPassword = "Driver@123";
            }

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                PhoneNumber = phone,
                EmailConfirmed = true
            };

            var createResult = await _userManager.CreateAsync(user, defaultPassword);

            if (!createResult.Succeeded)
            {
                return (false, createResult.Errors.Select(e => e.Description).ToArray(), 0, null, null);
            }

            var roleResult = await _userManager.AddToRoleAsync(user, "driver");

            if (!roleResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);
                return (false, roleResult.Errors.Select(e => e.Description).ToArray(), 0, null, null);
            }

            var driver = new Driver
            {
                FullName = fullName,
                Email = email,
                PhoneNumber = phone,
                BranchId = driverdto.BranchId,
                Salary = driverdto.Salary,
                StartWorkDate = driverdto.StartWorkDate,
                IsAvailable = true,
                UserId = user.Id
            };

            try
            {
                await _context.Drivers.AddAsync(driver);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                await _userManager.DeleteAsync(user);
                return (false, new[] { "A driver with this email or phone already exists." }, 0, null, null);
            }

            return (
                true,
                Array.Empty<string>(),
                driver.DriverId,
                user.Id,
                defaultPassword);
        }
        public async Task<(bool Success, string[] Errors, int? CustomerId, string? UserId, string? Token)> RegisterEmployeeAsync(EmployeeDto dto)
        {
            // Check Identity accounts.
            if (await _userManager.FindByEmailAsync(dto.Email) != null)
            {
                return (false, new[] { "Email is already registered." },
                    null, null, null);
            }

            // Employee has unique email and phone constraints too.
            if (await _context.Employees.AnyAsync(e =>
                e.Email == dto.Email || e.PhoneNumber == dto.PhoneNumber))
            {
                return (false, new[]
                {
                "An employee with this email or phone already exists."
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
