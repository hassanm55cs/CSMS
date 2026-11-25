using System.Globalization;

namespace CSMS.Helper;

public static class GeoHelper
{
    private const double EarthRadiusKm = 6371.0;
    private const double AverageSpeedKmh = 40.0;

    public static bool IsValid(double latitude, double longitude)
    {
        return latitude is >= -90 and <= 90 && longitude is >= -180 and <= 180;
    }

    // Coordinates are stored as strings in the existing Driver / EmergencyRequest tables.
    public static string Format(double value)
    {
        return value.ToString("0.######", CultureInfo.InvariantCulture);
    }

    public static bool TryParse(
        string? latitude,
        string? longitude,
        out double parsedLatitude,
        out double parsedLongitude)
    {
        parsedLatitude = 0;
        parsedLongitude = 0;

        return double.TryParse(latitude, NumberStyles.Float, CultureInfo.InvariantCulture, out parsedLatitude) &&
               double.TryParse(longitude, NumberStyles.Float, CultureInfo.InvariantCulture, out parsedLongitude) &&
               IsValid(parsedLatitude, parsedLongitude);
    }

    public static double DistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        return EarthRadiusKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    // Straight-line estimate at an average city speed; good enough for a tracking screen.
    public static int EstimateEtaMinutes(double distanceKm)
    {
        return (int)Math.Ceiling(distanceKm / AverageSpeedKmh * 60);
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
}
