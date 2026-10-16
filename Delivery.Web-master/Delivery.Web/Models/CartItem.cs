namespace Delivery.Web.Models;

public class CartItem
{
    public Product Product { get; set; } = null!;

    public int Quantity { get; set; }

    public decimal Total =>
        Product.Price * Quantity;
}