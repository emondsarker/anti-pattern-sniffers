import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderService {
  async processOrder(order: any) {
    if (order.status === 'pending_review') {
      await this.sendReviewNotification(order);
    }

    if (order.status === 'pending_review') {
      order.reviewCount++;
    }

    if (order.status === 'pending_review') {
      this.logger.log('Order pending review');
    }

    if (order.type === 'express_shipping') {
      order.priority = 'high';
    }

    if (order.type === 'express_shipping') {
      order.fee += 15;
    }

    if (order.type === 'express_shipping') {
      await this.notifyWarehouse(order);
    }
  }

  getStatusLabel(status: string) {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
    }
  }
}
