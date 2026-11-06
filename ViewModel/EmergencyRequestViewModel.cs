using CSMS.Enums;

namespace CSMS.ViewModel;

public class EmergencyProblemTypeViewModel
{
    public EmergencyProblemType Id { get; set; }

    public string Label { get; set; } = null!;

    public string LabelAr { get; set; } = null!;

    public string Description { get; set; } = null!;
}

public class EmergencyRequestViewModel
{
    public int EmergencyRequestId { get; set; }

    public DateTime RequestedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string CarLicencePlate { get; set; } = null!;

    public string? CarCompany { get; set; }

    public string? CarModel { get; set; }

    public string ProblemType { get; set; } = null!;

    public string? Description { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public StatusEmergency Status { get; set; }

    public int? DriverId { get; set; }

    public string? DriverName { get; set; }

    public decimal? DriverLatitude { get; set; }

    public decimal? DriverLongitude { get; set; }

    public int? EtaMinutes { get; set; }

    public string? TruckLicencePlate { get; set; }

    public string? TruckCompany { get; set; }

    public string? TruckModel { get; set; }

    public string? BranchName { get; set; }

    public string? CustomerName { get; set; }

    public string? CustomerPhone { get; set; }

    public string? CancellationReason { get; set; }
}

public class EmergencyRequestActionViewModel
{
    public int EmergencyRequestId { get; set; }

    public StatusEmergency Status { get; set; }

    public int? DriverId { get; set; }

    public string? TruckLicencePlate { get; set; }

    public decimal? DriverLatitude { get; set; }

    public decimal? DriverLongitude { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
