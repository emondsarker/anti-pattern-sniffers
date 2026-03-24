import { Controller, Post, Body } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async create(@Body() body: any) {
    // Validation logic
    if (!body.items || body.items.length === 0) {
      throw new Error('Items required');
    }

    // Business logic that should be in service
    const user = await this.ordersService.getUser(body.userId);
    const items = body.items;

    let total = 0;
    for (const item of items) {
      const price = item.price * item.quantity;
      const discount = user.tier === 'gold' ? price * 0.1 : 0;
      total += price - discount;
    }

    const tax = total * 0.08;
    const finalTotal = total + tax;

    const shipping = items.reduce((sum: number, item: any) => {
      return sum + (item.weight > 5 ? 10 : 5);
    }, 0);

    const grandTotal = finalTotal + shipping;

    // More calculations
    const loyaltyPoints = Math.floor(grandTotal / 10);
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

    const order = await this.ordersService.create({
      userId: body.userId,
      items,
      total: grandTotal,
      tax,
      shipping,
      loyaltyPoints,
      estimatedDelivery,
    });

    // Notification
    if (grandTotal > 100) {
      await this.ordersService.sendVipNotification(user);
    }

    // Analytics
    await this.ordersService.trackConversion(order);

    return { success: true, order };
  }
}
