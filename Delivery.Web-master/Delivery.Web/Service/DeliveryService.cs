using Delivery.Web.Models;

namespace Delivery.Web.Services;

public class DeliveryService
{
    private readonly List<User> _users =
    [
        new User
        {
            Id = 1,
            Name = "João",
            Email = "joao@email.com",
            Password = "123456"
        }
    ];

    private readonly List<Restaurant> _restaurants =
    [
        new Restaurant
        {
            Id = 1,
            Name = "Burger House",
            Products =
            [
                new Product
                {
                    Id = 1,
                    Name = "X-Burger",
                    Price = 25
                },
                new Product
                {
                    Id = 2,
                    Name = "Batata Frita",
                    Price = 15
                },
                new Product
                {
                    Id = 3,
                    Name = "Refrigerante",
                    Price = 8
                }
            ]
        }
    ];

    private readonly List<Order> _orders = [];

    public User? Login(string email, string password)
    {
        return _users.FirstOrDefault(x =>
            x.Email == email &&
            x.Password == password);
    }

    public List<Restaurant> GetRestaurants()
    {
        return _restaurants;
    }

    public Restaurant? GetRestaurant(int id)
    {
        return _restaurants.FirstOrDefault(x => x.Id == id);
    }

    public int CreateOrder(
        int userId,
        List<CartItem> items,
        string paymentMethod)
    {
        if (items.Count == 0)
            throw new InvalidOperationException(
                "O carrinho está vazio.");

        if (string.IsNullOrWhiteSpace(paymentMethod))
            throw new InvalidOperationException(
                "Forma de pagamento obrigatória.");

        var order = new Order
        {
            Id = _orders.Count + 1,
            UserId = userId,
            Items = items,
            PaymentMethod = paymentMethod,
            Status = "Confirmado"
        };

        _orders.Add(order);

        return order.Id;
    }

    public Order? GetOrder(int id)
    {
        return _orders.FirstOrDefault(x => x.Id == id);
    }
}