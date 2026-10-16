namespace Delivery.Web.Models;

public class Restaurant
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public List<Product> Products { get; set; } = [];
}