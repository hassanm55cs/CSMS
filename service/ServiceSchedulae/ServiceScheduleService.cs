using CSMS.AppServices.Interfaces;
using CSMS.Data;
using CSMS.Dto.ServiceSchedule;
using CSMS.Models;
using Microsoft.EntityFrameworkCore;

namespace CSMS.AppServices.Implementations
{
    public class ServiceScheduleService : IServiceScheduleService
    {
        private readonly ApplicationDbContext _context;

        public ServiceScheduleService(ApplicationDbContext context)
        {
            _context = context;
        }

        // ── GET ALL ───────────────────────────────────────────────────────
        public async Task<List<ServiceScheduleResponseDto>> GetAllAsync()
        {
            var schedules = await _context.ServiceByKms
                .Include(s => s.Products)
                .AsNoTracking()
                .OrderBy(s => s.KilometerInterval)
                .ToListAsync();

            return schedules.Select(MapToResponse).ToList();
        }

        // ── CREATE ────────────────────────────────────────────────────────
        public async Task<ServiceScheduleResponseDto> CreateAsync(ServiceScheduleRequestDto dto)
        {
            var entity = new ServiceByKm
            {
                KilometerInterval = dto.KilometerInterval,
                Description       = dto.Description,
                Price             = dto.Price,
                Products          = new List<Product>()
            };

            if (dto.ProductIds.Count > 0)
            {
                var products = await _context.Products
                    .Where(p => dto.ProductIds.Contains(p.ProductId))
                    .ToListAsync();

                foreach (var product in products)
                    entity.Products.Add(product);
            }

            _context.ServiceByKms.Add(entity);
            await _context.SaveChangesAsync();

            // Reload to return fully populated response
            return MapToResponse(await LoadByIdAsync(entity.ServiceByKmId));
        }

        // ── UPDATE ────────────────────────────────────────────────────────
        public async Task<ServiceScheduleResponseDto?> UpdateAsync(int serviceByKmId, ServiceScheduleRequestDto dto)
        {
            // Load with Products for M:N replacement
            var entity = await _context.ServiceByKms
                .Include(s => s.Products)
                .FirstOrDefaultAsync(s => s.ServiceByKmId == serviceByKmId);

            if (entity is null)
                return null;

            entity.KilometerInterval = dto.KilometerInterval;
            entity.Description       = dto.Description;
            entity.Price             = dto.Price;

            // Replace linked products
            entity.Products.Clear();

            if (dto.ProductIds.Count > 0)
            {
                var products = await _context.Products
                    .Where(p => dto.ProductIds.Contains(p.ProductId))
                    .ToListAsync();

                foreach (var product in products)
                    entity.Products.Add(product);
            }

            await _context.SaveChangesAsync();

            return MapToResponse(await LoadByIdAsync(serviceByKmId));
        }

        // ── DELETE ────────────────────────────────────────────────────────
        public async Task<bool> DeleteAsync(int serviceByKmId)
        {
            var entity = await _context.ServiceByKms
                .Include(s => s.Products)
                .FirstOrDefaultAsync(s => s.ServiceByKmId == serviceByKmId);

            if (entity is null)
                return false;

            // Clear M:N links before removing the entity
            entity.Products.Clear();
            _context.ServiceByKms.Remove(entity);
            await _context.SaveChangesAsync();

            return true;
        }

        // ── HELPERS ───────────────────────────────────────────────────────
        private async Task<ServiceByKm> LoadByIdAsync(int id) =>
            await _context.ServiceByKms
                .Include(s => s.Products)
                .AsNoTracking()
                .FirstAsync(s => s.ServiceByKmId == id);

        private static ServiceScheduleResponseDto MapToResponse(ServiceByKm s) => new()
        {
            ServiceByKmId     = s.ServiceByKmId,
            KilometerInterval = s.KilometerInterval,
            Description       = s.Description,
            Price             = s.Price,
            Products          = s.Products.Select(p => new ServiceScheduleProductDto
            {
                ProductId = p.ProductId,
                Name      = p.Name,
                Price     = p.Price
            }).ToList()
        };
    }
}
