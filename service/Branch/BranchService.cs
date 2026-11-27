using CSMS.Data;
using CSMS.Dto.Branch;
using CSMS.Dto.Common;
using CSMS.Models;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Branch
{
    public class BranchService : IBranchService
    {
        private readonly ApplicationDbContext _context;

        public BranchService(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<PagedResult<BranchListItemDto>> GetAllAsync(
            int page, int pageSize,
            string? search,
            double? latitude, double? longitude)
        {
            var query = _context.ServiceBranches
                .Include(b => b.Manager)
                .Include(b => b.Employees)
                .Include(b => b.Drivers)
                .AsNoTracking();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var lower = search.ToLower();
                query = query.Where(b =>
                    b.BranchName.ToLower().Contains(lower) ||
                    b.BranchLocation.ToLower().Contains(lower));
            }

            var totalCount = await query.CountAsync();

            var branches = await query
                .OrderBy(b => b.BranchId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = branches.Select(MapToListItem).ToList();

            return new PagedResult<BranchListItemDto>
            {
                Page       = page,
                PageSize   = pageSize,
                TotalCount = totalCount,
                Data       = items
            };
        }
        public async Task<BranchDetailDto?> GetByIdAsync(int branchId)
        {
            var branch = await _context.ServiceBranches
                .Include(b => b.Manager)
                .Include(b => b.Employees)
                .Include(b => b.BranchProducts)
                    .ThenInclude(bp => bp.Product)
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.BranchId == branchId);

            return branch is null ? null : MapToDetail(branch);
        }

        public async Task<BranchDetailDto> CreateAsync(BranchRequestDto dto)
        {
            var branch = new ServiceBranch
            {
                BranchName     = dto.BranchName,
                BranchLocation = dto.BranchLocation,
                Latitude       = dto.Latitude,
                Longitude      = dto.Longitude,
                OpenTime       = TimeOnly.Parse(dto.OpenTime),
                CloseTime      = TimeOnly.Parse(dto.CloseTime),
                OpeningDate    = dto.OpeningDate,
                ManagerId      = dto.ManagerId
            };

            _context.ServiceBranches.Add(branch);
            await _context.SaveChangesAsync();

            return (await GetByIdAsync(branch.BranchId))!;
        }

   
        public async Task<BranchDetailDto?> UpdateAsync(int branchId, BranchRequestDto dto)
        {
            var branch = await _context.ServiceBranches.FindAsync(branchId);
            if (branch is null) return null;

            branch.BranchName     = dto.BranchName;
            branch.BranchLocation = dto.BranchLocation;
            branch.Latitude       = dto.Latitude;
            branch.Longitude      = dto.Longitude;
            branch.OpenTime       = TimeOnly.Parse(dto.OpenTime);
            branch.CloseTime      = TimeOnly.Parse(dto.CloseTime);
            branch.OpeningDate    = dto.OpeningDate;
            branch.ManagerId      = dto.ManagerId;

            await _context.SaveChangesAsync();
            return (await GetByIdAsync(branchId))!;
        }

    
        public async Task<bool?> DeleteAsync(int branchId)
        {
            var branch = await _context.ServiceBranches.FindAsync(branchId);
            if (branch is null) return null;
            bool hasEmployees = await _context.Employees.AnyAsync(e => e.BranchId == branchId);
            bool hasVisits    = await _context.Visits.AnyAsync(v => v.BranchId == branchId);
            bool hasTrucks    = await _context.EmergencyTrucks.AnyAsync(t => t.BranchId == branchId);
            bool hasInventory = await _context.BranchProducts.AnyAsync(bp => bp.BranchId == branchId);

            if (hasEmployees || hasVisits || hasTrucks || hasInventory)
            {
                var reasons = new List<string>();
                if (hasEmployees) reasons.Add("employees");
                if (hasVisits)    reasons.Add("visits");
                if (hasTrucks)    reasons.Add("emergency trucks");
                if (hasInventory) reasons.Add("inventory");

                throw new InvalidOperationException(
                    $"Cannot delete branch. It still has: {string.Join(", ", reasons)}.");
            }

            _context.ServiceBranches.Remove(branch);
            await _context.SaveChangesAsync();
            return true;
        }
        private static BranchListItemDto MapToListItem(ServiceBranch b) => new()
        {
            BranchId      = b.BranchId,
            Name          = b.BranchName,
            Location      = b.BranchLocation,
            Latitude      = b.Latitude,
            Longitude     = b.Longitude,
            OpenTime      = b.OpenTime.ToString("HH:mm"),
            CloseTime     = b.CloseTime.ToString("HH:mm"),
            EmployeeCount = b.Employees?.Count ?? 0,
            DriverCount   = b.Drivers?.Count   ?? 0,
            Manager       = b.Manager is null ? null : new ManagerSummaryDto
            {
                EmployeeId = b.Manager.EmployeeId,
                FullName   = b.Manager.FullName,
                Email      = b.Manager.Email
            }
        };

        private static BranchDetailDto MapToDetail(ServiceBranch b) => new()
        {
            BranchId    = b.BranchId,
            Name        = b.BranchName,
            Location    = b.BranchLocation,
            Latitude    = b.Latitude,
            Longitude   = b.Longitude,
            OpenTime    = b.OpenTime.ToString("HH:mm"),
            CloseTime   = b.CloseTime.ToString("HH:mm"),
            OpeningDate = b.OpeningDate,
            Manager     = b.Manager is null ? null : new ManagerSummaryDto
            {
                EmployeeId = b.Manager.EmployeeId,
                FullName   = b.Manager.FullName,
                Email      = b.Manager.Email
            },
            Employees = b.Employees?.Select(e => new EmployeeSummaryDto
            {
                EmployeeId        = e.EmployeeId,
                FullName          = e.FullName,
                Email             = e.Email,
                Faculty           = e.Facultly,
                YearsOfExperience = e.YearsOfExperince
            }).ToList() ?? [],
            Products = b.BranchProducts?.Select(bp => new BranchProductSummaryDto
            {
                ProductId      = bp.Product.ProductId,
                Name           = bp.Product.Name,
                Price          = bp.Product.Price,
                Quantity       = bp.Quantity,
                WarrantyMonths = bp.Product.WarrantyMonths
            }).ToList() ?? []
        };
    }
}
