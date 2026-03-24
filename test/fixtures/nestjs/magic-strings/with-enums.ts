import { Injectable } from '@nestjs/common';

enum OrderStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

enum ShippingType {
  EXPRESS = 'express_shipping',
  STANDARD = 'standard_shipping',
}

@Injectable()
export class OrderService {
  async processOrder(order: any) {
    if (order.status === OrderStatus.PENDING_REVIEW) {
      await this.sendReviewNotification(order);
    }

    if (order.type === ShippingType.EXPRESS) {
      order.priority = 'high';
    }
  }
}
