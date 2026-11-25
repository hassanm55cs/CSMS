using CSMS.ViewModel;

namespace CSMS.Helper;

public static class SosProblemTypes
{
    public static readonly IReadOnlyList<ProblemTypeViewModel> All = new List<ProblemTypeViewModel>
    {
        new() { Id = "FlatTire", Label = "Flat tire", LabelAr = "بنشر في الكاوتش", Description = "A tire is flat or damaged and the car cannot be driven." },
        new() { Id = "DeadBattery", Label = "Dead battery", LabelAr = "بطارية فاضية", Description = "The car will not start because the battery is empty." },
        new() { Id = "OutOfFuel", Label = "Out of fuel", LabelAr = "نفد الوقود", Description = "The car ran out of fuel." },
        new() { Id = "EngineFailure", Label = "Engine failure", LabelAr = "عطل في الموتور", Description = "The engine stopped or shows a serious fault." },
        new() { Id = "Overheating", Label = "Overheating", LabelAr = "ارتفاع حرارة الموتور", Description = "The engine temperature is too high to keep driving." },
        new() { Id = "LockedOut", Label = "Locked out", LabelAr = "مفتاح العربية اتقفل جواها", Description = "The keys are locked inside the car or lost." },
        new() { Id = "Accident", Label = "Accident", LabelAr = "حادثة", Description = "The car was in an accident and needs help or towing." },
        new() { Id = "Other", Label = "Other", LabelAr = "مشكلة تانية", Description = "Any other roadside problem." }
    };

    // Returns the canonical id (case-insensitive match) or null if unknown.
    public static string? Find(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var key = value.Trim();
        return All.FirstOrDefault(item =>
            string.Equals(item.Id, key, StringComparison.OrdinalIgnoreCase))?.Id;
    }
}
