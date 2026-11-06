using CSMS.Data;
using CSMS.Dto;
using CSMS.ViewModel;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Profile;

public class ProfileService
{
    private readonly ApplicationDbContext _context;

    public ProfileService(ApplicationDbContext context)
    {
        _context = context;
    }

    public Task<CustomerProfileViewModel?> GetProfileAsync(string userId)
    {
        return _context.Customers
            .AsNoTracking()
            .Where(customer => customer.UserId == userId)
            .Select(customer => new CustomerProfileViewModel
            {
                CustomerId = customer.CustomerId,
                FullName = customer.FullName,
                Email = customer.Email,
                Phone = customer.Phone,
                Address = customer.Address
            })
            .SingleOrDefaultAsync();
    }

    public async Task<ProfileUpdateStatus> UpdateProfileAsync(
        string userId,
        UpdateCustomerProfileDto dto)
    {
        var customer = await _context.Customers
            .SingleOrDefaultAsync(item => item.UserId == userId);
        if (customer is null)
        {
            return ProfileUpdateStatus.NotFound;
        }

        var phoneAlreadyUsed = await _context.Customers.AnyAsync(item =>
            item.CustomerId != customer.CustomerId && item.Phone == dto.Phone);
        if (phoneAlreadyUsed)
        {
            return ProfileUpdateStatus.PhoneAlreadyUsed;
        }

        customer.FullName = dto.FullName;
        customer.Phone = dto.Phone;
        customer.Address = dto.Address;
        await _context.SaveChangesAsync();

        return ProfileUpdateStatus.Updated;
    }
}

public enum ProfileUpdateStatus
{
    Updated,
    NotFound,
    PhoneAlreadyUsed
}
