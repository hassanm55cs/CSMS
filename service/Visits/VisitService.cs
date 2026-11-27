using System.Data;
using CSMS.Data;
using CSMS.Dto.Common;
using CSMS.Dto.NotificationDto;
using CSMS.Dto.Visit;
using CSMS.Enums;
using CSMS.Helper;
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

            // 2. Every requested product must be available from the selected branch.
            List<int> productIds = dto.ServiceProductIds is { Count: > 0 }
                ? dto.ServiceProductIds
                : dto.ServiceProductId.HasValue ? [dto.ServiceProductId.Value] : [];
            if (productIds.Count == 0 || productIds.Any(id => id <= 0))
                throw new InvalidOperationException("Select at least one valid service product.");
            if (productIds.Distinct().Count() != productIds.Count)
                throw new InvalidOperationException("Duplicate service products are not allowed.");

            // 3. Service date must not be in the past
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (dto.ServiceDate < today)
                throw new InvalidOperationException("Service date must not be in the past.");

            await using var transaction = _context.Database.IsRelational()
                ? await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable)
                : null;

            // 4. No existing open visit for the same car (checked inside Serializable tx to prevent race duplicates)
            var conflictExists = await _context.Visits.AnyAsync(v =>
                v.CarId == dto.CarLicencePlate &&
                v.Status != Status.Completed &&
                v.Status != Status.Cancelled);
            if (conflictExists)
                throw new InvalidOperationException(
                    $"Car '{dto.CarLicencePlate}' already has an open visit on {dto.ServiceDate}.");

            // Atomically reserve 1 unit of each selected product from branch inventory
            await ReserveBranchStockAsync(dto.BranchId, productIds);

            // Create Visit — EmployeeId = null until assigned via PUT /visits/{id}/assignment
            var visit = new Visit
            {
                CarId       = dto.CarLicencePlate,
                BranchId    = dto.BranchId,
                ServiceDate = dto.ServiceDate,
                Status      = Status.Entered,
            };
            _context.Visits.Add(visit);
            await _context.SaveChangesAsync();  // get VisitId

            // Create one initial Service record for each product chosen by the customer.
            var services = productIds.Select(productId => new Service
            {
                VisitId       = visit.VisitId,
                ProductId     = productId,
                ServiceDate   = DateTime.UtcNow,
                StatusService = StatusService.normal,
                Description   = dto.CustomerNotes ?? string.Empty,
                Approved      = true,
            }).ToList();
            _context.Services.AddRange(services);
            await _context.SaveChangesAsync();

            if (transaction is not null)
                await transaction.CommitAsync();

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
            var visit = await _context.Visits
                .Include(v => v.Services)
                .FirstOrDefaultAsync(v =>
                    v.VisitId == visitId &&
                    v.Car.Customer.UserId == customerId &&
                    v.Status != Status.Cancelled &&
                    v.Status != Status.Completed);
            if (visit is null) return null;

            // Restock every approved/reserved product back to the branch inventory
            var reservedProductIds = visit.Services
                .Where(s => s.Approved)
                .Select(s => s.ProductId)
                .ToList();
            await RestockBranchStockAsync(visit.BranchId, reservedProductIds);

            visit.Status = Status.Cancelled;
            await _context.SaveChangesAsync();
            await NotifyVisitStatusChangedAsync(customerId, visit.VisitId, visit.Status);

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
                query = query.Where(v =>
                    (v.BranchId == emp.BranchId && v.EmployeeId == null &&
                     v.Status != Status.Completed && v.Status != Status.Cancelled) ||
                    v.EmployeeId == emp.EmployeeId);

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
                    .ThenInclude(c => c.Customer)
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
            await NotifyVisitStatusChangedAsync(visit.Car?.Customer?.UserId, visit.VisitId, visit.Status);

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
                    .ThenInclude(c => c.Customer)
                .Include(v => v.Branch)
                .Include(v => v.Employee)
                .Include(v => v.Services)
                .FirstOrDefaultAsync(v => v.VisitId == visitId);

            if (visit is null) return null;

            bool statusChanged = visit.Status != newStatus.Value;
            if (newStatus.Value == Status.Cancelled &&
                visit.Status != Status.Cancelled &&
                visit.Status != Status.Completed)
            {
                var reservedProductIds = visit.Services
                    .Where(s => s.Approved)
                    .Select(s => s.ProductId)
                    .ToList();
                await RestockBranchStockAsync(visit.BranchId, reservedProductIds);
            }

            visit.Status = newStatus.Value;
            await _context.SaveChangesAsync();

            if (statusChanged)
                await NotifyVisitStatusChangedAsync(visit.Car?.Customer?.UserId, visit.VisitId, visit.Status);

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

            var diagnosisProductIds = dto.Items
                .Where(item => item.ProductId.HasValue && item.ProductId.Value > 0)
                .Select(item => item.ProductId!.Value)
                .Distinct()
                .ToList();
            var customerSelectedProductIds = await _context.Services
                .AsNoTracking()
                .Where(service => service.VisitId == visitId && service.Approved)
                .Select(service => service.ProductId)
                .Distinct()
                .ToListAsync();
            var duplicateProductIds = diagnosisProductIds.Intersect(customerSelectedProductIds).ToList();
            if (duplicateProductIds.Count > 0)
                throw new InvalidOperationException(
                    $"Product(s) {string.Join(", ", duplicateProductIds)} were already selected by the customer for this booking.");

            if (diagnosisProductIds.Count > 0)
            {
                var availableProductIds = await _context.BranchProducts
                    .AsNoTracking()
                    .Where(branchProduct => branchProduct.BranchId == visit.BranchId &&
                        diagnosisProductIds.Contains(branchProduct.ProductId) && branchProduct.Quantity > 0)
                    .Select(branchProduct => branchProduct.ProductId)
                    .ToListAsync();
                var unavailableProductIds = diagnosisProductIds.Except(availableProductIds).ToList();
                if (unavailableProductIds.Count > 0)
                    throw new InvalidOperationException(
                        $"Product(s) {string.Join(", ", unavailableProductIds)} are not available at this visit's branch or are out of stock.");
            }

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
            await NotifyVisitStatusChangedAsync(visit.Car?.Customer?.UserId, visit.VisitId, visit.Status);
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
            await using var transaction = _context.Database.IsRelational()
                ? await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable)
                : null;

            var visit = await _context.Visits
                .Include(v => v.Services)
                .FirstOrDefaultAsync(v => v.VisitId == visitId && v.Car.Customer.UserId == customerId);
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

            var newlyApprovedProductIds = visit.Services
                .Where(svc => !svc.Approved && dto.ApprovedServiceIds.Contains(svc.ServiceId))
                .Select(svc => svc.ProductId)
                .ToList();

            var newlyRejectedReservedProductIds = visit.Services
                .Where(svc => svc.Approved && dto.RejectedServiceIds.Contains(svc.ServiceId))
                .Select(svc => svc.ProductId)
                .ToList();

            await ReserveBranchStockAsync(visit.BranchId, newlyApprovedProductIds);
            await RestockBranchStockAsync(visit.BranchId, newlyRejectedReservedProductIds);

            foreach (var svc in visit.Services)
            {
                if (dto.ApprovedServiceIds.Contains(svc.ServiceId))
                    svc.Approved = true;
                else if (dto.RejectedServiceIds.Contains(svc.ServiceId))
                    svc.Approved = false;
            }

            // Move out of the confirmation state after the customer submits, even if all items are rejected.
            bool anyApproved = visit.Services.Any(s => dto.ApprovedServiceIds.Contains(s.ServiceId));
            visit.Status = anyApproved ? Status.InProgress : Status.serviceRejected;

            await _context.SaveChangesAsync();
            if (transaction is not null)
                await transaction.CommitAsync();

            await NotifyVisitStatusChangedAsync(customerId, visit.VisitId, visit.Status);

            return new ConfirmationResponseDto
            {
                VisitId       = visitId,
                Status        = VisitStatusHelper.ToApiString(visit.Status),
                ApprovedCount = dto.ApprovedServiceIds.Count,
                RejectedCount = dto.RejectedServiceIds.Count,
            };
        }

        private async Task ReserveBranchStockAsync(int branchId, IReadOnlyCollection<int> productIds)
        {
            if (productIds.Count == 0)
                return;

            var counts = productIds
                .GroupBy(id => id)
                .OrderBy(g => g.Key) // deterministic lock order to avoid deadlocks
                .ToList();

            if (_context.Database.IsRelational())
            {
                foreach (var group in counts)
                {
                    var productId = group.Key;
                    var needed = group.Count();
                    var affected = await _context.BranchProducts
                        .Where(bp => bp.BranchId == branchId && bp.ProductId == productId && bp.Quantity >= needed)
                        .ExecuteUpdateAsync(setters => setters.SetProperty(bp => bp.Quantity, bp => bp.Quantity - needed));

                    if (affected == 0)
                        throw new InvalidOperationException(
                            $"Product(s) {productId} are not available at branch {branchId} or are out of stock.");
                }
                return;
            }

            var distinctIds = counts.Select(g => g.Key).ToList();
            var entries = await _context.BranchProducts
                .Where(bp => bp.BranchId == branchId && distinctIds.Contains(bp.ProductId))
                .ToListAsync();
            var entryMap = entries.ToDictionary(bp => bp.ProductId);

            var insufficient = new List<int>();
            foreach (var group in counts)
            {
                if (!entryMap.TryGetValue(group.Key, out var entry) || entry.Quantity < group.Count())
                    insufficient.Add(group.Key);
            }

            if (insufficient.Count > 0)
                throw new InvalidOperationException(
                    $"Product(s) {string.Join(", ", insufficient)} are not available at branch {branchId} or are out of stock.");

            foreach (var group in counts)
            {
                entryMap[group.Key].Quantity -= group.Count();
            }
        }

        private async Task RestockBranchStockAsync(int branchId, IReadOnlyCollection<int> productIds)
        {
            if (productIds.Count == 0)
                return;

            var counts = productIds
                .GroupBy(id => id)
                .OrderBy(g => g.Key)
                .ToList();

            if (_context.Database.IsRelational())
            {
                foreach (var group in counts)
                {
                    var productId = group.Key;
                    var count = group.Count();
                    await _context.BranchProducts
                        .Where(bp => bp.BranchId == branchId && bp.ProductId == productId)
                        .ExecuteUpdateAsync(setters => setters.SetProperty(bp => bp.Quantity, bp => bp.Quantity + count));
                }
                return;
            }

            var distinctIds = counts.Select(g => g.Key).ToList();
            var entries = await _context.BranchProducts
                .Where(bp => bp.BranchId == branchId && distinctIds.Contains(bp.ProductId))
                .ToListAsync();

            var countMap = counts.ToDictionary(g => g.Key, g => g.Count());
            foreach (var entry in entries)
            {
                if (countMap.TryGetValue(entry.ProductId, out var count))
                    entry.Quantity += count;
            }
        }

        private async Task NotifyVisitStatusChangedAsync(string? customerUserId, int visitId, Status status)
        {
            if (string.IsNullOrWhiteSpace(customerUserId))
                return;

            await _notificationHub.Clients
                .Group(NotificationHub.GroupName(customerUserId))
                .SendAsync("VisitStatusChanged", new VisitStatusChangedNotification(
                    visitId,
                    VisitStatusHelper.ToApiString(status)));
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
                    .ThenInclude(c => c.Customer)
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
            var activeEmergencyStatuses = EmergencyStatusHelper.ActiveStatuses;
            var request = await _context.EmergencyRequests
                .Include(i => i.Driver)
                .Include(i => i.Truck)
                .Where(i => i.CarLicencePlate == visit.Car.LicencesPlate &&
                            activeEmergencyStatuses.Contains(i.StatusEmergency))
                .OrderByDescending(i => i.EmergencyRequestId)
                .FirstOrDefaultAsync();
            if (request is not null)
            {
                request.StatusEmergency = StatusEmergency.completed;
                request.UpdatedAt = DateTime.UtcNow;
                if (request.Driver is not null)
                {
                    request.Driver.IsAvailable = true;
                }
                if (request.Truck is not null)
                {
                    request.Truck.IsAvailable = true;
                }
            }

            visit.Status = Status.Completed ;//if there is a emegency request for that car and this car is finoshed change the status of the emegency request 
            await _context.SaveChangesAsync();
            await NotifyVisitStatusChangedAsync(visit.Car?.Customer?.UserId, visit.VisitId, visit.Status);

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
