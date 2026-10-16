namespace Delivery.Web.Models;

public class Order
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public List<CartItem> Items { get; set; } = [];

    public string PaymentMethod { get; set; } = string.Empty;

    public string Status { get; set; } = "Aguardando confirmação";

    public decimal Total =>
        Items.Sum(x => x.Total);
}