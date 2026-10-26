using CSMS.Enums;

namespace CSMS.ViewModel
{
    public class CustomerCar
    {
        public string Phone { get; set; }

        public string Email { get; set; }

        public string FullName { get; set; }

        public string Address { get; set; }
        public List<Cars> Cars1 { get; set; }
    }
    public class Cars{
        public string LicencesPlate { get; set; }
        public int NoOfCylinders { get; set; }

        public FuelType FuelType { get; set; }

        public EngineType EngineType { get; set; }

        public DateOnly ManufactuareDate { get; set; }

        public string CarCompany { get; set; } = null!;

        public string Model { get; set; } = null!;

        public int CustomerId { get; set; }

        public double PriceInEgp { get; set; }

        public int CurrentKm { get; set; }


    }
}
