using CSMS.Dto.Branch;
using CSMS.Dto.Common;

namespace CSMS.service.Branch
{
    public interface IBranchService
    {
        /// <summary>
        /// Returns a paginated, optionally searched list of branches.
        /// latitude/longitude are accepted for future proximity sorting.
        /// </summary>
        Task<PagedResult<BranchListItemDto>> GetAllAsync(
            int page, int pageSize,
            string? search,
            double? latitude, double? longitude);

        Task<BranchDetailDto?> GetByIdAsync(int branchId);

        Task<BranchDetailDto> CreateAsync(BranchRequestDto dto);

        Task<BranchDetailDto?> UpdateAsync(int branchId, BranchRequestDto dto);

        /// <summary>
        /// Returns true on success.
        /// Throws <see cref="InvalidOperationException"/> when dependants exist (→ 409).
        /// Returns null when not found (→ 404).
        /// </summary>
        Task<bool?> DeleteAsync(int branchId);
    }
}
