using CSMS.Data;
using CSMS.Dto.Common;
using CSMS.Dto.NotificationDto;
using CSMS.Dto.Visit;
using CSMS.Enums;
using CSMS.Helpers;
using CSMS.Hubs;
using CSMS.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CSMS.service.Visits
{
    /// <summary>
    /// Concrete implementation of <see cref="IVisitService"/>.
    /// Handles all booking and visit business logic.
    /// </summary>
    public class VisitService : IVisitService
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<NotificationHub> _notificationHub;

        public VisitService(
            ApplicationDbContext context,
            IHubContext<NotificationHub> notificationHub)
        {
            _context = context;
            _notificationHub = notificationHub;
        }

        // ════════════════════════════════════════════════════════════════
        // BOOKINGS
        // ════════════════════════════════════════════════════════════════

        /// <inheritdoc/>
        public async Task<BookingResponseDto> CreateBookingAsync(string customerId, BookingRequestDto dto)
        {
            // 1. Car must exist
            var car = await _context.Cars
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.LicencesPlate == dto.CarLicencePlate&& c.Customer.UserId == customerId);
            if (car is null)
                throw new InvalidOperationException($"Car with licence plate '{dto.CarLicencePlate}' was not found.");

            // 2. Product must exist and be stocked at the branch
            var branchProduct = await _context.BranchProducts
                .AsNoTracking()
                .FirstOrDefaultAsync(bp =>
                    bp.BranchId == dto.BranchId &&
                    bp.ProductId == dto.ServiceProductId &&
                    bp.Quantity > 0);
            if (branchProduct is null)
                throw new InvalidOperationException(
                    $"Product {dto.ServiceProductId} is not available at branch {dto.BranchId} or is out of stock.");

            // 3. Service date must not be in the past
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (dto.ServiceDate < today)
                throw new InvalidOperationException("Service date must not be in the past.");

            // 4. No existing open visit for the same car on the same date
            var conflictExists = await _context.Visits.AnyAsync(v =>
                v.CarId == dto.CarLicencePlate &&
                v.ServiceDate == dto.ServiceDate &&
                v.Status != Status.Completed);
            if (conflictExists)
                throw new InvalidOperationException(
                    $"Car '{dto.CarLicencePlate}' already has an open visit on {dto.ServiceDate}.");

            // Create Visit — EmployeeId = 1 (placeholder; assign later via PUT /visits/{id}/assignment)
            var visit = new Visit
            {
                CarId       = dto.CarLicencePlate,
                BranchId    = dto.BranchId,
                //EmployeeId  = null,   // temporary placeholder
                ServiceDate = dto.ServiceDate,
                Status      = Status.Entered,
            };
            _context.Visits.Add(visit);
            await _context.SaveChangesAsync();  // get VisitId

            // Create initial Service record
            var service = new Service
            {
                VisitId       = visit.VisitId,
                ProductId     = dto.ServiceProductId,
                ServiceDate   = DateTime.UtcNow,
                StatusService = StatusService.normal,
                Description   = dto.CustomerNotes ?? string.Empty,
                Approved      = true,
            };
            _context.Services.Add(service);
            await _context.SaveChangesAsync();

            return new BookingResponseDto
            {
                VisitId          = visit.VisitId,
                BookingReference = $"CSMS-{visit.VisitId}",
                CarLicencePlate  = visit.CarId,
                BranchId         = visit.BranchId,
                ServiceDate      = visit.ServiceDate,
                Status           = VisitStatusHelper.ToApiString(visit.Status),
            };
        }

        /// <inheritdoc/>
        public async Task<PagedResult<VisitListItemDto>> GetBookingsAsync(
            string customerId,
            string? status,
            DateOnly? fromDate,
            DateOnly? toDate,
            string? carLicencePlate,
            int page,
            int pageSize)
        {
            var query = _context.Visits
                .Include(v => v.Car)
                .Include(v => v.Branch)
                .Include(v => v.Employee)
                .Include(v => v.Services)
                .Where(v => v.Car.Customer.UserId == customerId)
                .AsNoTracking();

            // Optional filters
            if (!string.IsNullOrWhiteSpace(status))
            {
                var enumStatus = VisitStatusHelper.FromApiString(status);
                if (enumStatus.HasValue)
                    query = query.Where(v => v.Status == enumStatus.Value);
            }

            if (fromDate.HasValue)
                query = query.Where(v => v.ServiceDate >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(v => v.ServiceDate <= toDate.Value);

            if (!string.IsNullOrWhiteSpace(carLicencePlate))
                query = query.Where(v => v.CarId == carLicencePlate);

            var totalCount = await query.CountAsync();

            var visits = await query
                .OrderByDescending(v => v.ServiceDate)
                .ThenByDescending(v => v.VisitId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<VisitListItemDto>
            {
                Page       = page,
                PageSize   = pageSize,
                TotalCount = totalCount,
                Data       = visits.Select(MapToListItem).ToList(),
            };
        }

        /// <inheritdoc/>
        public async Task<VisitDetailDto?> GetBookingDetailAsync(string customerId, int visitId)
        {//this we can get the visit details when i press on it 
            var visit = await _context.Visits
                .Include(v => v.Car)
                .Include(v => v.Branch)
                .Include(v => v.Employee)
                .Include(v => v.Services)
                    .ThenInclude(s => s.Product)
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.VisitId == visitId&& v.Car.Customer.UserId == customerId);

            return visit is null ? null : MapToDetail(visit);
        }

        /// <inheritdoc/>
        public async Task<BookingResponseDto?> CancelBookingAsync(string customerId, int visitId, string? reason)
        {
            var visit = await _context.Visits.FirstOrDefaultAsync(v => v.VisitId == visitId 
            && 
            v.Car.Customer.UserId == customerId
            && 
            (v.Status != Status.Cancelled||v.Status!=Status.Completed));
            if (visit is null) return null;

            // Use Status.ended to represent cancellation (no dedicated Cancelled enum value exists).
            visit.Status = Status.Cancelled;//cancelled the visit
            await _context.SaveChangesAsync();

            // Optionally attach cancellation reason as a service note
            if (!string.IsNullOrWhiteSpace(reason))
            {
                var firstService = await _context.Services
                    .FirstOrDefaultAsync(s => s.VisitId == visitId);
                if (firstService is not null)
                {
                    firstService.Description = $"[CANCELLED] {reason} | {firstService.Description}";
                    await _context.SaveChangesAsync();
                }
            }

            return new BookingResponseDto
            {
                VisitId          = visit.VisitId,
                BookingReference = $"CSMS-{visit.VisitId}",
                CarLicencePlate  = visit.CarId,
                BranchId         = visit.BranchId,
                ServiceDate      = visit.ServiceDate,
                Status           = VisitStatusHelper.ToApiString(visit.Status),
            };
        }

        // ════════════════════════════════════════════════════════════════
        // VISITS (staff-side)
        // ════════════════════════════════════════════════════════════════

        /// <inheritdoc/>
        public async Task<PagedResult<VisitListItemDto>> GetVisitsAsync(
            string employeeUserId,
            string? status,
            DateOnly? fromDate,
            DateOnly? toDate,
            int page,
            int pageSize)
        {
            var query = _context.Visits
                .Include(v => v.Car)
                .Include(v => v.Branch)
                .Include(v => v.Employee)
                .Include(v => v.Services)
                .AsNoTracking()
                .AsQueryable();
            var emp= await _context.Employees.FirstOrDefaultAsync(e => e.UserId == employeeUserId);

            if (emp is null) return null;

            if (!string.IsNullOrWhiteSpace(employeeUserId))
                query = query.Where(v=>emp.BranchId==v.BranchId&&v.EmployeeId==null||v.EmployeeId==emp.EmployeeId&&v.Status==Status.CustomerConfirmed);

            if (!string.IsNullOrWhiteSpace(status))
            {
                var enumStatus = VisitStatusHelper.FromApiString(status);
                if (enumStatus.HasValue)
                    query = query.Where(v => v.Status == enumStatus.Value);
            }

            if (fromDate.HasValue)
                query = query.Where(v => v.ServiceDate >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(v => v.ServiceDate <= toDate.Value);

            var totalCount = await query.CountAsync();

            var visits = await query
                .OrderByDescending(v => v.ServiceDate)
                .ThenByDescending(v => v.VisitId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<VisitListItemDto>
            {
                Page       = page,
                PageSize   = pageSize,
                TotalCount = totalCount,
                Data       = visits.Select(MapToListItem).ToList(),
            };
        }

        /// <inheritdoc/>
        public async Task<VisitListItemDto?> AssignEmployeeAsync(string employeeUserId, int visitId)
        {
            var visit = await _context.Visits
                .Include(v => v.Car)
                .Include(v => v.Branch)
                .Include(v => v.Employee)
                .Include(v => v.Services)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit is null) return null;

            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.UserId == employeeUserId);

            if (employee is null)
                throw new InvalidOperationException($"Employee with id {employeeUserId} was not found.");

            if (employee.BranchId != visit.BranchId)
                throw new InvalidOperationException(
                    $"Employee {employeeUserId} belongs to branch {employee.BranchId}, " +
                    $"not the visit's branch {visit.BranchId}.");

            visit.EmployeeId = employee.EmployeeId;
            visit.Status = Status.UnderDIagnosis;
            await _context.SaveChangesAsync();

            // Reload the navigation property for the response
            await _context.Entry(visit).Reference(v => v.Employee).LoadAsync();

            return MapToListItem(visit);
        }

        /// <inheritdoc/>
        public async Task<VisitListItemDto?> UpdateStatusAsync(int visitId, StatusUpdateDto dto)
        {
            var newStatus = VisitStatusHelper.FromApiString(dto.Status);
            if (!newStatus.HasValue)
                throw new InvalidOperationException(
                    $"'{dto.Status}' is not a valid status. Valid values: " +
                    string.Join(", ", VisitStatusHelper.ValidApiStrings));

            var visit = await _context.Visits
                .Include(v => v.Car)
                .Include(v => v.Branch)
                .Include(v => v.Employee)
                .Include(v => v.Services)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit is null) return null;

            visit.Status = newStatus.Value;
            await _context.SaveChangesAsync();

            return MapToListItem(visit);
        }

        /// <inheritdoc/>
        public async Task<DiagnosisResponseDto?> SubmitDiagnosisAsync(string employeeUserId, int visitId, DiagnosisDto dto)
        {
            var visit = await _context.Visits
                .Include(v => v.Car)
                    .ThenInclude(car => car.Customer)
                .FirstOrDefaultAsync(v => v.VisitId == visitId&&v.Employee!=null&&v.Employee.UserId == employeeUserId);

            if (visit is null) return null;

            visit.Status = Status.DiagnosesSentToCustomer;

            var createdServices = new List<Service>();
            int skippedCount = 0;

            foreach (var item in dto.Items)
            {
                // Skip items without a productId — Service.ProductId is non-nullable in the schema.
                if (!item.ProductId.HasValue || item.ProductId.Value <= 0)
                {
                    skippedCount++;
                    continue;
                }

                var svc = new Service
                {
                    VisitId       = visitId,
                    ProductId     = item.ProductId.Value,
                    ServiceDate   = DateTime.UtcNow,
                    Description   = item.Description,
                    StatusService = ParseSeverity(item.Severity),
                    Approved      = false,
                };
                _context.Services.Add(svc);
                createdServices.Add(svc);
            }

            await _context.SaveChangesAsync();
            await NotifyCustomerDiagnosisReadyAsync(visit);

            // Load products for the response
            var productIds = createdServices.Select(s => s.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Where(p => productIds.Contains(p.ProductId))
                .AsNoTracking()
                .ToDictionaryAsync(p => p.ProductId);

            return new DiagnosisResponseDto
            {
                VisitId          = visitId,
                Status           = VisitStatusHelper.ToApiString(visit.Status),
                SkippedItemCount = skippedCount,
                CreatedItems     = createdServices.Select(s => MapServiceToDto(s, products)).ToList(),
            };
        }

        /// <inheritdoc/>
        public async Task<ConfirmationResponseDto?> ProcessCustomerConfirmationAsync(string customerId,
            int visitId, CustomerConfirmationDto dto)
        {
            var visit = await _context.Visits
                .Include(v => v.Services)
                .FirstOrDefaultAsync(v => v.VisitId == visitId&& v.Car.Customer.UserId == customerId);
            if (visit is null) return null;

            if (visit.Status != Status.DiagnosesSentToCustomer)
                throw new InvalidOperationException("This visit is not waiting for customer confirmation.");

            var selectedIds = dto.ApprovedServiceIds
            .Concat(dto.RejectedServiceIds)
             .ToList();

            var serviceIds = visit.Services
                .Select(s => s.ServiceId)
                .ToList();

            if (!selectedIds.All(id => serviceIds.Contains(id)))
                throw new Exception("Invalid service IDs for this visit.");



            foreach (var svc in visit.Services)
            {
                if (dto.ApprovedServiceIds.Contains(svc.ServiceId))
                    svc.Approved = true;
                else if (dto.RejectedServiceIds.Contains(svc.ServiceId))
                    svc.Approved = false;
            }

            // Move out of the confirmation state after the customer submits, even if all items are rejected.
            bool anyApproved = visit.Services.Any(s => dto.ApprovedServiceIds.Contains(s.ServiceId));
            visit.Status = anyApproved ? Status.serviceApproved : Status.serviceRejected;

            await _context.SaveChangesAsync();

            return new ConfirmationResponseDto
            {
                VisitId       = visitId,
                Status        = VisitStatusHelper.ToApiString(visit.Status),
                ApprovedCount = dto.ApprovedServiceIds.Count,
                RejectedCount = dto.RejectedServiceIds.Count,
            };
        }

        private async Task NotifyCustomerDiagnosisReadyAsync(Visit visit)
        {
            var customerUserId = visit.Car.Customer.UserId;
            if (string.IsNullOrWhiteSpace(customerUserId) || !visit.EmployeeId.HasValue)
                return;

            var notification = new Notification
            {
                CustomerId = visit.Car.CustomerId,
                EmployeeId = visit.EmployeeId.Value,
                VisitId = visit.VisitId,
                Message = "A diagnosis is ready for your review.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            await _notificationHub.Clients
                .Group(NotificationHub.GroupName(customerUserId))
                .SendAsync("VisitDiagnosisReady", new VisitDiagnosisNotification(
                    notification.NotificationId,
                    visit.VisitId,
                    notification.Message,
                    notification.CreatedAt));
        }

        /// <inheritdoc/>
        public async Task<CompletionResponseDto?> CompleteVisitAsync(int visitId, CompletionDto dto)
        {
            var visit = await _context.Visits
                .Include(v => v.Car)
                .Include(v => v.Services)
                .FirstOrDefaultAsync(v => v.VisitId == visitId&&v.Status!=Status.DiagnosesSentToCustomer&& v.Status != Status.Entered);

            if (visit is null) return null;

            // Update car odometer
            visit.Car.CurrentKm = dto.FinalKm;

            // Mark specified services as approved (completed)
            foreach (var svc in visit.Services)
            {
                if (dto.CompletedServiceIds.Contains(svc.ServiceId))
                    svc.Approved = true;
            }

            // Optionally store completion notes on first service
            if (!string.IsNullOrWhiteSpace(dto.CompletionNotes))
            {
                var firstSvc = visit.Services.FirstOrDefault();
                if (firstSvc is not null)
                    firstSvc.Description = $"[COMPLETED] {dto.CompletionNotes} | {firstSvc.Description}";
            }

            visit.Status = Status.Completed ;
            await _context.SaveChangesAsync();

            return new CompletionResponseDto
            {
                VisitId = visitId,
                Status  = VisitStatusHelper.ToApiString(visit.Status),
                FinalKm = dto.FinalKm,
            };
        }

        /// <inheritdoc/>
        public async Task<List<ServiceItemDto>?> GetServicesAsync(int visitId)
        {
            var visitExists = await _context.Visits.AnyAsync(v => v.VisitId == visitId);
            if (!visitExists) return null;

            var services = await _context.Services
                .Include(s => s.Product)
                .Where(s => s.VisitId == visitId)
                .AsNoTracking()
                .ToListAsync();

            var productMap = services
                .Where(s => s.Product is not null)
                .Select(s => s.Product!)
                .DistinctBy(p => p.ProductId)
                .ToDictionary(p => p.ProductId);

            return services.Select(s => MapServiceToDto(s, productMap)).ToList();
        }

        // ════════════════════════════════════════════════════════════════
        // Private helpers
        // ════════════════════════════════════════════════════════════════

        private static VisitListItemDto MapToListItem(Visit v) => new()
        {
            VisitId          = v.VisitId,
            BookingReference = $"CSMS-{v.VisitId}",
            CarLicencePlate  = v.CarId,
            CarCompany       = v.Car?.CarCompany ?? string.Empty,
            CarModel         = v.Car?.Model ?? string.Empty,
            BranchId         = v.BranchId,
            BranchName       = v.Branch?.BranchName ?? string.Empty,
            ServiceDate      = v.ServiceDate,
            Status           = VisitStatusHelper.ToApiString(v.Status),
            EmployeeId       = v.EmployeeId,
            EmployeeName     = v.Employee?.FullName ?? string.Empty,
            ServiceCount     = v.Services?.Count ?? 0,
        };

        private static VisitDetailDto MapToDetail(Visit v) => new()
        {
            VisitId          = v.VisitId,
            BookingReference = $"CSMS-{v.VisitId}",
            Status           = VisitStatusHelper.ToApiString(v.Status),
            ServiceDate      = v.ServiceDate,
            Car = new CarSummaryDto
            {
                LicencePlate = v.CarId,
                Company      = v.Car?.CarCompany ?? string.Empty,
                Model        = v.Car?.Model ?? string.Empty,
            },
            Branch = new BranchSummaryDto
            {
                BranchId = v.BranchId,
                Name     = v.Branch?.BranchName ?? string.Empty,
            },
            Employee = new EmployeeSummaryInVisitDto
            {
                EmployeeId = v.EmployeeId,
                FullName   = v.Employee?.FullName ?? string.Empty,
            },
            CustomerNotes = v.Services?.FirstOrDefault()?.Description,
            Services      = v.Services?
                .Select(s => MapServiceToDto(s, null))
                .ToList() ?? [],
        };

        private static ServiceItemDto MapServiceToDto(
            Service s,
            Dictionary<int, Product>? productMap) => new()
        {
            ServiceId   = s.ServiceId,
            ServiceDate = s.ServiceDate,
            Product     = (productMap is not null && productMap.TryGetValue(s.ProductId, out var p))
                          || s.Product is not null
                ? new ProductInServiceDto
                {
                    ProductId = s.ProductId,
                    Name      = (productMap?.GetValueOrDefault(s.ProductId) ?? s.Product)?.Name ?? string.Empty,
                    Price     = (productMap?.GetValueOrDefault(s.ProductId) ?? s.Product)?.Price ?? 0,
                }
                : null,
            StatusService = SeverityToString(s.StatusService),
            Description   = s.Description ?? string.Empty,
            Approved      = s.Approved,
        };

        /// <summary>Converts the <see cref="StatusService"/> enum to an API-friendly string.</summary>
        private static string SeverityToString(StatusService ss) => ss switch
        {
            StatusService.crtical => "critical",
            StatusService.warning => "warning",
            StatusService.normal  => "normal",
            _                     => ss.ToString(),
        };

        /// <summary>Parses the API severity string into <see cref="StatusService"/>.</summary>
        private static StatusService ParseSeverity(string severity) =>
            severity.ToLowerInvariant() switch
            {
                "critical" => StatusService.crtical,
                "warning"  => StatusService.warning,
                "normal"   => StatusService.normal,
            };
    }
}
