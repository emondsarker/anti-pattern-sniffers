# NestJS Sniffers

This document covers the five NestJS-specific sniffers: `god-service`, `missing-dtos`, `business-logic-in-controllers`, `missing-guards`, and `magic-strings`.

---

## god-service

**Detects**: `@Injectable()` services that have too many constructor dependencies or too many public methods.

**Why it matters**: A service with 10 injected dependencies is doing the work of several services. It violates the Single Responsibility Principle, makes unit testing painful (you need to mock everything), and creates tight coupling across your application.

**Bad** -- gets flagged:

```ts
@Injectable()
class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly profileRepo: ProfileRepository,
    private readonly orderRepo: OrderRepository,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly paymentService: PaymentService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async createUser(dto: CreateUserDto) { /* ... */ }
  async updateProfile(id: string, dto: UpdateProfileDto) { /* ... */ }
  async deleteUser(id: string) { /* ... */ }
  async getUserOrders(id: string) { /* ... */ }
  async sendWelcomeEmail(id: string) { /* ... */ }
  async processPayment(id: string, amount: number) { /* ... */ }
  async invalidateCache(id: string) { /* ... */ }
  async trackActivity(id: string, action: string) { /* ... */ }
}
```

This service has 9 constructor dependencies (threshold: 8). It handles user CRUD, orders, emails, payments, caching, and analytics -- all in one class.

**Good** -- passes:

```ts
@Injectable()
class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly profileRepo: ProfileRepository,
    private readonly cacheService: CacheService,
  ) {}

  async createUser(dto: CreateUserDto) { /* ... */ }
  async updateProfile(id: string, dto: UpdateProfileDto) { /* ... */ }
  async deleteUser(id: string) { /* ... */ }
}

@Injectable()
class UserNotificationService {
  constructor(
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async sendWelcomeEmail(userId: string) { /* ... */ }
}
```

Each service owns a single domain concern. The user service handles CRUD, the notification service handles messaging.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `maxDependencies` | number | `8` | Maximum constructor-injected dependencies. |
| `maxPublicMethods` | number | `15` | Maximum public methods in a service class. |
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/users/user.service.ts:2
  Service "UserService" has 9 constructor dependencies (threshold: 8). Consider splitting into focused services.
```

---

## missing-dtos

**Detects**: Two related problems -- (1) `@Body()`, `@Param()`, or `@Query()` parameters without type annotations (or typed as `any`), and (2) DTO classes that exist but have no `class-validator` decorators.

**Why it matters**: Without typed DTOs and validation decorators, NestJS cannot validate incoming request data. Your handlers receive raw, unvalidated input. A DTO without `@IsString()` or `@IsNotEmpty()` decorators is just a plain object that provides no runtime safety.

**Bad** -- gets flagged (untyped parameters):

```ts
@Controller('users')
class UserController {
  @Post()
  async createUser(@Body() body) {
    return this.userService.create(body);
  }

  @Get(':id')
  async getUser(@Param() params: any) {
    return this.userService.findOne(params.id);
  }
}
```

The `body` parameter has no type annotation. The `params` parameter is typed as `any`. Neither provides compile-time or runtime safety.

**Bad** -- gets flagged (DTO without validators):

```ts
class CreateUserDto {
  name: string;
  email: string;
  age: number;
}
```

The DTO class exists but has no `class-validator` decorators. NestJS `ValidationPipe` will not enforce any constraints.

**Good** -- passes:

```ts
import { IsString, IsNotEmpty, IsEmail, IsInt, Min } from 'class-validator';

class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(13)
  age: number;
}

@Controller('users')
class UserController {
  @Post()
  async createUser(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }
}
```

The DTO has proper validation decorators, and the `@Body()` parameter is typed with the DTO class. NestJS `ValidationPipe` will reject invalid input automatically.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/users/user.controller.ts:4
  Parameter "body" with @Body() has no type annotation. Use a properly typed DTO class.

[warning] src/users/create-user.dto.ts:1
  DTO class "CreateUserDto" has no class-validator decorators. Add validation decorators to enforce input constraints.
```

---

## business-logic-in-controllers

**Detects**: Controller methods (decorated with `@Get()`, `@Post()`, etc.) that contain business logic patterns like `.map()`, `.filter()`, `.reduce()`, `for` loops, `while` loops, or computational keywords like `calculate` and `compute`. Also flags methods that exceed a line count threshold.

**Why it matters**: Controllers should only handle HTTP concerns: parse the request, call a service, return the response. When business logic lives in the controller, it cannot be reused by other controllers, tested without HTTP context, or maintained independently.

**Bad** -- gets flagged:

```ts
@Controller('orders')
class OrderController {
  @Post()
  async createOrder(@Body() body: CreateOrderDto) {
    const products = await this.productRepo.findByIds(body.productIds);

    const subtotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const discount = subtotal > 100 ? subtotal * 0.1 : 0;
    const tax = (subtotal - discount) * 0.08;
    const total = subtotal - discount + tax;

    const filtered = products.filter(p => p.stock > 0);
    for (const product of filtered) {
      product.stock -= 1;
      await this.productRepo.save(product);
    }

    const order = await this.orderRepo.create({
      products: filtered.map(p => p.id),
      total,
    });

    return order;
  }
}
```

The controller method has `.reduce()`, `.filter()`, `.map()`, and a `for` loop. All of this is business logic that belongs in a service.

**Good** -- passes:

```ts
@Controller('orders')
class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(@Body() body: CreateOrderDto) {
    return this.orderService.placeOrder(body.productIds);
  }
}
```

The controller delegates everything to `OrderService`. The method is three lines: receive input, call service, return result.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `maxMethodLines` | number | `50` | Maximum lines in a controller method body. |
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/orders/order.controller.ts:3
  @Post() handler "createOrder" contains business logic patterns detected: .reduce(, .filter(, .map(, for(. Move logic to a service.
```

---

## missing-guards

**Detects**: Route handlers on sensitive paths (containing keywords like `admin`, `auth`, `user`, `password`, `settings`, `dashboard`, `token`, or `secret`) that have no `@UseGuards()` decorator at the method or class level.

**Why it matters**: Forgetting to add an authentication or authorization guard to a sensitive endpoint is a security vulnerability. This sniffer catches routes that handle user data, admin panels, or authentication flows without any guard protection.

**Bad** -- gets flagged:

```ts
@Controller('admin')
class AdminController {
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.removeUser(id);
  }
}
```

Both handlers are on the `admin` path (a sensitive keyword) with no `@UseGuards()` on the class or either method. Anyone can access the admin dashboard and delete users.

**Good** -- passes (class-level guard):

```ts
@UseGuards(AuthGuard, RolesGuard)
@Controller('admin')
class AdminController {
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.removeUser(id);
  }
}
```

A class-level `@UseGuards()` protects all routes in the controller. The sniffer also accepts method-level guards if you need fine-grained control.

**Good** -- passes (method-level guard):

```ts
@Controller('admin')
class AdminController {
  @UseGuards(AuthGuard)
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.removeUser(id);
  }
}
```

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

The sniffer checks for these sensitive keywords in the controller path and route path: `admin`, `auth`, `login`, `password`, `account`, `settings`, `dashboard`, `user`, `token`, `secret`.

**Sample output**:

```
[warning] src/admin/admin.controller.ts:3
  @Get() handler "getDashboard" on sensitive path "admin/dashboard" has no @UseGuards protection.
```

---

## magic-strings

**Detects**: String literals that appear 3 or more times in conditional expressions (`===`, `!==`, or `case` statements).

**Why it matters**: Repeating the same string in multiple conditionals creates a maintenance hazard. A typo in one place (`'actve'` instead of `'active'`) will silently pass the compiler and cause a runtime bug. Extracting strings to constants or enums catches these errors at compile time.

**Bad** -- gets flagged:

```ts
@Injectable()
class OrderService {
  async processOrder(order: Order) {
    if (order.status === 'pending') {
      await this.validateOrder(order);
    }

    if (order.status === 'pending') {
      await this.reserveInventory(order);
    }

    switch (order.priority) {
      case 'pending':
        await this.queueForProcessing(order);
        break;
      case 'shipped':
        await this.notifyCustomer(order);
        break;
    }
  }

  async cancelOrder(order: Order) {
    if (order.status === 'pending') {
      await this.releaseInventory(order);
    }
  }
}
```

The string `'pending'` appears in 4 conditional expressions.

**Good** -- passes:

```ts
enum OrderStatus {
  Pending = 'pending',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

@Injectable()
class OrderService {
  async processOrder(order: Order) {
    if (order.status === OrderStatus.Pending) {
      await this.validateOrder(order);
    }

    if (order.status === OrderStatus.Pending) {
      await this.reserveInventory(order);
    }

    switch (order.priority) {
      case OrderStatus.Pending:
        await this.queueForProcessing(order);
        break;
      case OrderStatus.Shipped:
        await this.notifyCustomer(order);
        break;
    }
  }
}
```

Using a TypeScript enum means typos are caught at compile time, renaming is safe (IDE refactoring works), and the allowed values are documented in one place.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `minOccurrences` | number | `3` | Minimum number of times a string must appear in conditionals before it is flagged. |
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/orders/order.service.ts:4
  String "pending" appears in 4 conditional expressions. Extract to a constant or TypeScript enum.
```
