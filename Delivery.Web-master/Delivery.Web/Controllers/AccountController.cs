using Delivery.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace Delivery.Web.Controllers;

public class AccountController : Controller
{
    private readonly DeliveryService _service;

    public AccountController(DeliveryService service)
    {
        _service = service;
    }

    [HttpGet]
    public IActionResult Login()
    {
        return View();
    }

    [HttpPost]
    public IActionResult Login(
        string email,
        string password)
    {
        var user = _service.Login(email, password);

        if (user == null)
        {
            ViewBag.Error = "Usuário ou senha inválidos.";
            return View();
        }

        HttpContext.Session.SetInt32(
            "UserId",
            user.Id);

        return RedirectToAction(
            "Index",
            "Home");
    }
}