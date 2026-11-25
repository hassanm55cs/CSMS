namespace CSMS.Dto.Common
{
    /// <summary>Shared paginated result wrapper used across all list endpoints.</summary>
    public class PagedResult<T>
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalCount { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public List<T> Data { get; set; } = [];
    }
}
