import { Controller, Post, Body } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async create(@Body() body: CreateOrderDto) {
    return this.ordersService.createOrder(body);
  }
}
