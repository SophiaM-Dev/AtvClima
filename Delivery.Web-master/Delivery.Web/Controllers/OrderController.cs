using Delivery.Web.Models;
using Delivery.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace Delivery.Web.Controllers;

public class OrderController : Controller
{
    private readonly DeliveryService _service;

    public OrderController(DeliveryService service)
    {
        _service = service;
    }

    [HttpPost]
    public IActionResult Create(
        int productId,
        string paymentMethod)
    {
        var userId =
            HttpContext.Session.GetInt32("UserId");

        if (userId == null)
            return RedirectToAction(
                "Login",
                "Account");

        var restaurant =
            _service.GetRestaurant(1);

        var product =
            restaurant?.Products
                .FirstOrDefault(x => x.Id == productId);

        if (product == null)
            return NotFound();

        var items = new List<CartItem>
        {
            new CartItem
            {
                Product = product,
                Quantity = 1
            }
        };

        try
        {
            var orderId = _service.CreateOrder(
                userId.Value,
                items,
                paymentMethod);

            return RedirectToAction(
                "Tracking",
                new { id = orderId });
        }
        catch (InvalidOperationException ex)
        {
            ViewBag.Error = ex.Message;

            return RedirectToAction(
                "Menu",
                "Home",
                new { id = 1 });
        }
    }

    public IActionResult Tracking(int id)
    {
        var order = _service.GetOrder(id);

        if (order == null)
            return NotFound();

        return View(order);
    }
}