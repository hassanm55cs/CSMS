using System;
using System.Collections.Generic;
using CSMS.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CSMS.Data;

public partial class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext()
    {
    }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<BranchProduct> BranchProducts { get; set; }

    public virtual DbSet<Car> Cars { get; set; }

    public virtual DbSet<CarsForRent> CarsForRents { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<Driver> Drivers { get; set; }

    public virtual DbSet<EmergencyRequest> EmergencyRequests { get; set; }

    public virtual DbSet<EmergencyTruck> EmergencyTrucks { get; set; }

    public virtual DbSet<Employee> Employees { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<RentedCarCustomer> RentedCarCustomers { get; set; }

    public virtual DbSet<Service> Services { get; set; }

    public virtual DbSet<ServiceBranch> ServiceBranches { get; set; }

    public virtual DbSet<ServiceByKm> ServiceByKms { get; set; }

    public virtual DbSet<Visit> Visits { get; set; }
    public DbSet<Notification> Notifications{ get; set; }

    //    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    //#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
    //        => optionsBuilder.UseSqlServer("Server=localhost\\SQLEXPRESS;Database=CSMS;Trusted_Connection=True;TrustServerCertificate=True");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<BranchProduct>(entity =>
        {
            entity.HasKey(e => new { e.BranchId, e.ProductId });

            entity.HasIndex(e => e.BranchId, "IX_BranchProduct_BranchId");

            entity.HasIndex(e => e.ProductId, "IX_BranchProduct_ProductId");

            entity.HasOne(d => d.Branch).WithMany(p => p.BranchProducts)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.Product).WithMany(p => p.BranchProducts)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Car>(entity =>
        {
            entity.HasKey(e => e.LicencesPlate);

            entity.ToTable("Car");

            entity.HasIndex(e => e.CustomerId, "IX_Car_Customer_Id");

            entity.Property(e => e.LicencesPlate)
                .HasMaxLength(6)
                .HasColumnName("Licences_Plate");
            entity.Property(e => e.CarCompany)
                .HasMaxLength(35)
                .HasColumnName("Car_Company");
            entity.Property(e => e.Color).HasMaxLength(20);
            entity.Property(e => e.CurrentKm).HasColumnName("CurrentKM");
            entity.Property(e => e.CustomerId).HasColumnName("Customer_Id");
            entity.Property(e => e.EngineType)
                .HasMaxLength(50)
                .HasColumnName("Engine_type");
            entity.Property(e => e.FuelType)
                .HasMaxLength(15)
                .HasColumnName("Fuel_Type");
            entity.Property(e => e.ManufactuareDate).HasColumnName("manufactuare_date");
            entity.Property(e => e.Model).HasMaxLength(20);
            entity.Property(e => e.NoOfCylinders).HasColumnName("No_of_cylinders");

            entity.HasOne(d => d.Customer).WithMany(p => p.Cars)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.ClientSetNull);
            entity.Property(e => e.FuelType)
           .HasConversion<string>();

            entity.Property(e => e.EngineType)
                .HasConversion<string>();
        });

        modelBuilder.Entity<CarsForRent>(entity =>
        {
            entity.HasKey(e => e.LicencePlate);

            entity.Property(e => e.LicencePlate).HasMaxLength(6);
            entity.Property(e => e.CarCompany)
                .HasMaxLength(35)
                .HasColumnName("Car_Company");
            entity.Property(e => e.Color).HasMaxLength(20);
            entity.Property(e => e.EngineType)
                .HasMaxLength(50)
                .HasColumnName("Engine_type");
            entity.Property(e => e.FuelType)
                .HasMaxLength(15)
                .HasColumnName("Fuel_Type");
            entity.Property(e => e.ManufactuareDate).HasColumnName("manufactuare_date");
            entity.Property(e => e.Model).HasMaxLength(20);
            entity.Property(e => e.NoOfCylinders).HasColumnName("No_of_cylinders");
            entity.Property(e => e.FuelType)
           .HasConversion<string>();

            entity.Property(e => e.EngineType)
                .HasConversion<string>();
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("Customer");

            entity.HasIndex(e => e.Email, "IX_Customer_Email").IsUnique();

            entity.HasIndex(e => e.Phone, "IX_Customer_Phone").IsUnique();

            entity.Property(e => e.Address).HasMaxLength(50);
            entity.Property(e => e.Email).HasMaxLength(80);
            entity.Property(e => e.FullName)
                .HasMaxLength(30)
                .HasColumnName("Full_name");
            entity.Property(e => e.Phone).HasMaxLength(20);
        });

        modelBuilder.Entity<Driver>(entity =>
        {
            entity.HasIndex(e => e.BranchId, "IX_Drivers_BranchId");

            entity.HasIndex(e => e.Email, "IX_Drivers_Email").IsUnique();

            entity.HasIndex(e => e.PhoneNumber, "IX_Drivers_PhoneNumber").IsUnique();

            entity.Property(e => e.Email).HasMaxLength(80);
            entity.Property(e => e.FullName).HasMaxLength(30);

            entity.HasOne(d => d.Branch).WithMany(p => p.Drivers)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<EmergencyRequest>(entity =>
        {
            entity.HasIndex(e => e.CarLicencePlate, "IX_EmergencyRequests_Car_LicencePlate");

            entity.HasIndex(e => e.DriverId, "IX_EmergencyRequests_DriverId");

            entity.Property(e => e.CarLicencePlate)
                .HasMaxLength(6)
                .HasColumnName("Car_LicencePlate");
        

            entity.HasOne(d => d.CarLicencePlateNavigation).WithMany(p => p.EmergencyRequests).HasForeignKey(d => d.CarLicencePlate);

            entity.HasOne(d => d.Driver).WithMany(p => p.EmergencyRequests)
                .HasForeignKey(d => d.DriverId)
                .OnDelete(DeleteBehavior.ClientSetNull);
            entity.Property(e => e.StatusEmergency)
            .HasConversion<string>();
        });

        modelBuilder.Entity<EmergencyTruck>(entity =>
        {
            entity.HasKey(e => e.LicencePlate);

            entity.HasIndex(e => e.BranchId, "IX_EmergencyTrucks_BranchId");

            entity.HasIndex(e => e.DriverId, "IX_EmergencyTrucks_DriverId");

            entity.Property(e => e.LicencePlate).HasColumnName("Licence_Plate");
            entity.Property(e => e.ManufactuareDate).HasColumnName("Manufactuare_Date");

            entity.HasOne(d => d.Branch).WithMany(p => p.EmergencyTrucks)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.Driver).WithMany(p => p.EmergencyTrucks)
                .HasForeignKey(d => d.DriverId)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("Employee");

            entity.HasIndex(e => e.BranchId, "IX_Employee_BranchId");

            entity.HasIndex(e => e.Email, "IX_Employee_Email").IsUnique();

            entity.HasIndex(e => e.PhoneNumber, "IX_Employee_Phone_number").IsUnique();

            entity.Property(e => e.Email).HasMaxLength(80);
            entity.Property(e => e.Facultly).HasMaxLength(70);
            entity.Property(e => e.FullName)
                .HasMaxLength(30)
                .HasColumnName("Full_name");
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20)
                .HasColumnName("Phone_number");
            entity.Property(e => e.Salary)
                .HasColumnType("decimal(18, 2)")
                .HasColumnName("salary");
            entity.Property(e => e.StartingWorkDate).HasColumnName("Starting_work_date");
            entity.Property(e => e.YearsOfExperince).HasColumnName("Years_of_experince");

            entity.HasOne(d => d.Branch).WithMany(p => p.Employees)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.Property(e => e.Description).HasMaxLength(200);
            entity.Property(e => e.Name).HasMaxLength(50);
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");

            entity.HasMany(d => d.ServiceByKms).WithMany(p => p.Products)
                .UsingEntity<Dictionary<string, object>>(
                    "ServiceByKmProduct",
                   r => r.HasOne<ServiceByKm>().WithMany()
                        .HasForeignKey("ServiceByKmId")
                        .OnDelete(DeleteBehavior.ClientSetNull),
                    l => l.HasOne<Product>().WithMany()
                        .HasForeignKey("ProductId")
                        .OnDelete(DeleteBehavior.ClientSetNull),
                    j =>
                    {
                        j.HasKey("ProductId", "ServiceByKmId");
                        j.ToTable("ServiceByKmProducts");
                        j.HasIndex(new[] { "ServiceByKmId" }, "IX_ServiceByKmProducts_serviceByKmId");
                        j.IndexerProperty<int>("ProductId").HasColumnName("productId");
                        j.IndexerProperty<int>("ServiceByKmId").HasColumnName("serviceByKmId");
                    });
        });

        modelBuilder.Entity<RentedCarCustomer>(entity =>
        {
            entity.HasIndex(e => e.CustomerId, "IX_RentedCarCustomers_CustomerId");

            entity.HasIndex(e => e.LicencsePlateRented, "IX_RentedCarCustomers_LicencsePlateRented");

            entity.Property(e => e.LicencsePlateRented).HasMaxLength(6);
            entity.Property(e => e.NoOfDaysForRent).HasColumnName("No_ofDays_ForRent");

            entity.HasOne(d => d.Customer).WithMany(p => p.RentedCarCustomers)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.LicencsePlateRentedNavigation).WithMany(p => p.RentedCarCustomers)
                .HasForeignKey(d => d.LicencsePlateRented)
                .OnDelete(DeleteBehavior.ClientSetNull);
        });

        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasIndex(e => e.ProductId, "IX_Services_ProductId");

            entity.HasIndex(e => e.VisitId, "IX_Services_VisitId");

            entity.HasOne(d => d.Product).WithMany(p => p.Services)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.Visit).WithMany(p => p.Services)
                .HasForeignKey(d => d.VisitId)
                .OnDelete(DeleteBehavior.ClientSetNull);
            entity.Property(e => e.StatusService)
                .HasConversion<string>();
        });

        modelBuilder.Entity<ServiceBranch>(entity =>
        {
            entity.HasKey(e => e.BranchId);

            entity.ToTable("service_branches");

            entity.HasIndex(e => e.ManagerId, "IX_service_branches_ManagerId")
                .IsUnique()
                .HasFilter("([ManagerId] IS NOT NULL)");

            entity.Property(e => e.BranchLocation).HasColumnName("Branch_location");
            entity.Property(e => e.BranchName).HasColumnName("Branch_name");
            entity.Property(e => e.CloseTime).HasColumnName("Close_time");
            entity.Property(e => e.OpenTime).HasColumnName("Open_time");
            entity.Property(e => e.OpeningDate).HasColumnName("Opening_date");

            entity.HasOne(d => d.Manager).WithOne(p => p.ServiceBranch).HasForeignKey<ServiceBranch>(d => d.ManagerId);
        });

        modelBuilder.Entity<ServiceByKm>(entity =>
        {
            entity.ToTable("ServiceByKm");
        });

        modelBuilder.Entity<Visit>(entity =>
        {
            entity.ToTable("Visit");

            entity.HasIndex(e => e.BranchId, "IX_service_BranchId");

            entity.HasIndex(e => e.CarId, "IX_service_CarId");

            entity.HasIndex(e => e.EmployeeId, "IX_service_EmployeeId");

            entity.Property(e => e.CarId).HasMaxLength(6);
            entity.Property(e => e.ServiceDate).HasColumnName("Service_Date");

            entity.HasOne(d => d.Branch).WithMany(p => p.Visits)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.Car).WithMany(p => p.Visits)
                .HasForeignKey(d => d.CarId)
                .OnDelete(DeleteBehavior.ClientSetNull);

            entity.HasOne(d => d.Employee).WithMany(p => p.Visits)
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.ClientSetNull);
            entity.Property(e => e.Status)
         .HasConversion<string>();
        });
        //notification
        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.NotificationId);
            e.Property(n => n.Message).IsRequired();
            e.HasOne(n => n.Employee)
                .WithMany(e => e.Notifications)
                .HasForeignKey(n => n.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(n => n.Customer)
                .WithMany(c => c.Notifications)
                .HasForeignKey(n => n.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(n => n.Visit)
                .WithMany(v => v.Notifications)
                .HasForeignKey(n => n.VisitId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
