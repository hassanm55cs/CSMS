using CSMS.service.Emergency_serv;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("sos/problem-types")]
public class SosProblemTypesController : ControllerBase
{
    private readonly EmergencyService _emergencyService;

    public SosProblemTypesController(EmergencyService emergencyService)
    {
        _emergencyService = emergencyService;
    }

    [HttpGet]
    [AllowAnonymous]
    public IActionResult GetProblemTypes()
    {
        return Ok(new { Data = _emergencyService.GetProblemTypes() });
    }
}
