namespace CSMS.Dto;

public class RentalCarAvailabilityQueryDto
{
    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }
}
