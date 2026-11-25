using CSMS.AppServices.Implementations;
using CSMS.AppServices.Interfaces;
using CSMS.Data;
using CSMS.Helpers;
using CSMS.Hubs;
using CSMS.Models;
using CSMS.service.Adminserv;
using CSMS.service.Branch;
using CSMS.service.Car_serv;
using CSMS.service.ChangePassword;
using CSMS.service.ConfirmationEmail;
using CSMS.service.Customer_serv;
using CSMS.service.Driver_serv;
using CSMS.service.Emergency_serv;
using CSMS.service.Emial;
using CSMS.service.Inventory;
using CSMS.service.Login;
using CSMS.service.Notification_serv;
using CSMS.service.Products;
using CSMS.service.Profile;
using CSMS.service.Register;
using CSMS.service.Rental_serv;
using CSMS.service.Token;
using CSMS.service.Truck_serv;
using CSMS.service.Visits;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
//builder.Services.AddOpenApi();
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Components ??= new OpenApiComponents();

        document.Components.SecuritySchemes ??=
            new Dictionary<string, IOpenApiSecurityScheme>();

        document.Components.SecuritySchemes["Bearer"] =
            new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Enter your JWT token"
            };

        document.Security = new List<OpenApiSecurityRequirement>
        {
            new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("Bearer", document)] =
                    new List<string>()
            }
        };

        return Task.CompletedTask;
    });
});
builder.Services.AddDbContext<ApplicationDbContext>(options =>
              options.UseSqlServer(builder.Configuration.GetConnectionString("conString")));

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IChangePassword, ChangePassword>();
builder.Services.AddScoped<ICustomerSerivce, CustomerService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<CarService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ILoginService, LoginService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailConfirmationService, EmailConfirmationService>();
builder.Services.AddScoped<IVisitService, VisitService>();
builder.Services.AddScoped<IBranchService, BranchService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IVisitService, VisitService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IRentalService, RentalService>();
builder.Services.AddScoped<IRentalCarService, RentalCarService>();
builder.Services.AddScoped<IEmergencyTruckService, EmergencyTruckService>();
builder.Services.AddScoped<IEmergencyService, EmergencyService>();
builder.Services.AddScoped<IDriverService, DriverService>();//IServiceScheduleService
builder.Services.AddScoped<IServiceScheduleService,ServiceScheduleService>();


builder.Services.Configure<Jwt>(builder.Configuration.GetSection("Jwt"));//maping the jwt form the setting to the jwt class in the folder helper
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            JwtBearerDefaults.AuthenticationScheme;

        options.DefaultChallengeScheme =
            JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        var jwtSettings = builder.Configuration
            .GetSection("Jwt")
            .Get<Jwt>()!;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,

            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,

            ValidateLifetime = true,

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                   Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var requestPath = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) &&
                    requestPath.StartsWithSegments(NotificationHub.Route))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });


var app = builder.Build();

await SeedRolesAsync(app.Services);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openApi/v1.json", "v1"));
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>(NotificationHub.Route);

app.Run();

static async Task SeedRolesAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    string[] roles = ["driver", "customer", "admin", "employee"];

    foreach (var role in roles)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
        }
    }
}
