using CSMS.Dto.Common;

namespace CSMS.Dto.Branch
{
    public class BranchListItemDto
    {
        public int BranchId { get; set; }
        public string Name { get; set; } = null!;
        public string Location { get; set; } = null!;
        public string OpenTime { get; set; } = null!;
        public string CloseTime { get; set; } = null!;
        public ManagerSummaryDto? Manager { get; set; }
        public int EmployeeCount { get; set; }
        public int DriverCount { get; set; }
    }

    public class ManagerSummaryDto
    {
        public int EmployeeId { get; set; }
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
    }

    public class BranchDetailDto
    {
        public int BranchId { get; set; }
        public string Name { get; set; } = null!;
        public string Location { get; set; } = null!;
        public string OpenTime { get; set; } = null!;
        public string CloseTime { get; set; } = null!;
        public DateOnly OpeningDate { get; set; }
        public ManagerSummaryDto? Manager { get; set; }
        public List<EmployeeSummaryDto> Employees { get; set; } = [];
        public List<BranchProductSummaryDto> Products { get; set; } = [];
    }

    public class EmployeeSummaryDto
    {
        public int EmployeeId { get; set; }
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Faculty { get; set; } = null!;
        public int YearsOfExperience { get; set; }
    }

    public class BranchProductSummaryDto
    {
        public int ProductId { get; set; }
        public string Name { get; set; } = null!;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public int WarrantyMonths { get; set; }
    }
}
