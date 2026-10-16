
using Delivery.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace Delivery.Web.Controllers;

public class HomeController : Controller
{
    private readonly DeliveryService _service;

    public HomeController(DeliveryService service)
    {
        _service = service;
    }

    public IActionResult Index()
    {
        var restaurants = _service.GetRestaurants();
        return View(restaurants);
    }

    public IActionResult Menu(int id)
    {
        var restaurant = _service.GetRestaurant(id);

        if (restaurant == null)
            return NotFound();

        return View(restaurant);
    }

    public IActionResult Weather()
    {
        return View();
    }
}
