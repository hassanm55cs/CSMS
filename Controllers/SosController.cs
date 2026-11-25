using CSMS.Helper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CSMS.Controllers;

[ApiController]
[Route("/sos")]
public class SosController : ControllerBase
{
    [HttpGet("problem-types")]
    [AllowAnonymous]
    public IActionResult GetProblemTypes()
    {
        return Ok(new { Data = SosProblemTypes.All });
    }
}
