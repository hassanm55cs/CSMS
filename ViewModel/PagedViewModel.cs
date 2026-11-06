namespace CSMS.ViewModel;

public class PagedViewModel<T>
{
    public IReadOnlyList<T> Data { get; set; } = Array.Empty<T>();

    public int Page { get; set; }

    public int PageSize { get; set; }

    public int TotalCount { get; set; }
}
