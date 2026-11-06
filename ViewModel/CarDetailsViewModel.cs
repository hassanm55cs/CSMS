namespace CSMS.ViewModel;

public class CarDetailsViewModel : CarViewModel
{
    public CustomerSummaryViewModel Customer { get; set; } = null!;
}

public class CustomerSummaryViewModel
{
    public int CustomerId { get; set; }

    public string FullName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string Phone { get; set; } = null!;
}
