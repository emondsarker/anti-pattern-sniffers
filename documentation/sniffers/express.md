# Express Sniffers

This document covers the six Express-specific sniffers: `god-routes`, `missing-error-handling`, `fat-controllers`, `no-input-validation`, `callback-hell`, and `hardcoded-secrets`.

---

## god-routes

**Detects**: Route files that define too many route handlers in a single file.

**Why it matters**: A single file with dozens of `app.get()`, `router.post()`, and similar calls becomes impossible to navigate. It usually means unrelated endpoints are grouped together, making it hard to find, modify, or test individual routes.

**Bad** -- gets flagged:

```ts
const router = express.Router();

router.get('/users', listUsers);
router.post('/users', createUser);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/orders', listOrders);
router.post('/orders', createOrder);
router.get('/orders/:id', getOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/products', listProducts);
router.post('/products', createProduct);
```

This file has 11 route handlers, exceeding the default threshold of 10.

**Good** -- passes:

```ts
// users.routes.ts
const usersRouter = express.Router();
usersRouter.get('/', listUsers);
usersRouter.post('/', createUser);
usersRouter.get('/:id', getUser);
usersRouter.put('/:id', updateUser);
usersRouter.delete('/:id', deleteUser);
export default usersRouter;

// app.ts
app.use('/users', usersRouter);
app.use('/orders', ordersRouter);
app.use('/products', productsRouter);
```

Each domain gets its own route file. The main app mounts them as sub-routers.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `maxRoutes` | number | `10` | Maximum number of route handler calls per file. |
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/routes/api.ts:3
  File defines 11 route handlers (threshold: 10). Consider splitting into separate route files by domain.
```

---

## missing-error-handling

**Detects**: Async route handlers that have no `try-catch` block and no centralized error middleware (`(err, req, res, next)`) in the same file.

**Why it matters**: An unhandled promise rejection in an async Express handler will crash the process or silently fail. Without a try-catch or error middleware, the client receives no response and the server logs no useful error.

**Bad** -- gets flagged:

```ts
router.post('/users', async (req, res) => {
  const user = await UserService.create(req.body);
  const profile = await ProfileService.initialize(user.id);
  res.status(201).json({ user, profile });
});
```

If `UserService.create` or `ProfileService.initialize` throws, the error is unhandled.

**Good** -- passes:

```ts
router.post('/users', async (req, res, next) => {
  try {
    const user = await UserService.create(req.body);
    const profile = await ProfileService.initialize(user.id);
    res.status(201).json({ user, profile });
  } catch (err) {
    next(err);
  }
});

// Centralized error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

The try-catch forwards the error to centralized middleware. Either approach (try-catch in handler or error middleware in the file) satisfies the sniffer.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/routes/users.ts:5
  Async POST handler has no try-catch block and no error middleware found in file
```

---

## fat-controllers

**Detects**: Route handler callbacks that are too long (by line count) or perform too many `await` calls.

**Why it matters**: A route handler that fetches data, validates input, applies business rules, sends emails, and writes to the database is doing the job of an entire application layer. These handlers are untestable in isolation, hard to read, and impossible to reuse.

**Bad** -- gets flagged:

```ts
router.post('/orders', async (req, res) => {
  const user = await User.findById(req.body.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const items = await Product.find({ _id: { $in: req.body.itemIds } });
  const inventory = await Inventory.checkAvailability(items);
  if (!inventory.allAvailable) {
    return res.status(400).json({ error: 'Items unavailable' });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = await TaxService.calculate(subtotal, user.address);
  const total = subtotal + tax;

  const order = await Order.create({
    userId: user.id,
    items: items.map(i => i.id),
    total,
  });

  await EmailService.sendConfirmation(user.email, order);
  await AnalyticsService.trackPurchase(order);

  res.status(201).json(order);
});
```

This handler has 7 `await` calls (threshold: 3) and mixes data fetching, business logic, and side effects.

**Good** -- passes:

```ts
router.post('/orders', async (req, res, next) => {
  try {
    const order = await orderService.placeOrder(req.body.userId, req.body.itemIds);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});
```

The handler is thin. It parses input, calls a service, and sends the response. All business logic lives in `orderService.placeOrder`.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `maxLines` | number | `50` | Maximum lines in a route handler callback body. |
| `maxAwaits` | number | `3` | Maximum `await` expressions in a single handler. |
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/routes/orders.ts:1
  Route handler .post() is too complex: 7 await calls (threshold: 3)
```

---

## no-input-validation

**Detects**: Files that access `req.body`, `req.params`, or `req.query` without importing a validation library (such as `express-validator`, `joi`, `zod`, `yup`, `celebrate`, or `class-validator`).

**Why it matters**: Trusting user input without validation opens the door to injection attacks, type errors, and crashes. If no validation library is imported in the file, the input is likely being used raw.

**Bad** -- gets flagged:

```ts
import express from 'express';

const router = express.Router();

router.post('/register', async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const age = req.body.age;

  await User.create({ username, email, age });
  res.status(201).json({ message: 'Registered' });
});

router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});
```

The file accesses `req.body.username`, `req.body.email`, `req.body.age`, and `req.params.id` without importing any validation library.

**Good** -- passes:

```ts
import express from 'express';
import { z } from 'zod';

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  age: z.number().int().min(13),
});

const router = express.Router();

router.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  await User.create(data);
  res.status(201).json({ message: 'Registered' });
});
```

Importing `zod` (or any supported validation library) tells the sniffer that validation is present in this file.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/routes/register.ts:6
  Accessing req.body without a validation library imported
```

---

## callback-hell

**Detects**: Deeply nested callback patterns where the nesting depth (measured by `=> {` or `function() {` blocks) exceeds a threshold.

**Why it matters**: Deeply nested callbacks create code that is hard to read, hard to debug, and nearly impossible to test. Each nesting level adds cognitive load. Modern JavaScript provides `async/await` and `Promise` APIs that flatten this structure.

**Bad** -- gets flagged:

```ts
app.get('/report', (req, res) => {
  db.getUser(req.query.userId, (err, user) => {
    if (err) return res.status(500).send(err);
    db.getOrders(user.id, (err, orders) => {
      if (err) return res.status(500).send(err);
      db.getPayments(orders, (err, payments) => {
        if (err) return res.status(500).send(err);
        generateReport(user, orders, payments, (err, report) => {
          if (err) return res.status(500).send(err);
          res.json(report);
        });
      });
    });
  });
});
```

The callback nesting depth reaches 5, well above the default threshold of 3.

**Good** -- passes:

```ts
app.get('/report', async (req, res, next) => {
  try {
    const user = await db.getUser(req.query.userId);
    const orders = await db.getOrders(user.id);
    const payments = await db.getPayments(orders);
    const report = await generateReport(user, orders, payments);
    res.json(report);
  } catch (err) {
    next(err);
  }
});
```

Replacing callbacks with `async/await` eliminates the nesting entirely.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `maxDepth` | number | `3` | Maximum allowed callback nesting depth. |
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/routes/report.ts:7
  Callback nesting depth is 4 (threshold: 3)
```

---

## hardcoded-secrets

**Detects**: Hardcoded secrets in source code, including passwords, API keys, AWS access keys, authentication tokens, and database connection strings with embedded credentials.

**Why it matters**: Secrets committed to source code end up in version control history forever. Anyone with repository access can extract them. This is the most common cause of credential leaks and is flagged at `error` severity by default.

**Bad** -- gets flagged:

```ts
const dbPassword = 'super_secret_password_123';
const apiKey = 'sk-live-abc123def456ghi789jkl012mno345';
const awsKey = 'AKIAIOSFODNN7EXAMPLE';

const dbUrl = 'mongodb://admin:p4ssw0rd@db.example.com:27017/myapp';

const config = {
  secret: 'jwt-signing-secret-do-not-share',
  auth_token: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
};
```

Each line triggers a detection. The sniffer matches patterns like `password = '...'`, `api_key: '...'`, AWS access key format (`AKIA` followed by 16 characters), and connection strings containing `user:password@host`.

**Good** -- passes:

```ts
const dbPassword = process.env.DB_PASSWORD;
const apiKey = process.env.API_KEY;
const awsKey = process.env.AWS_ACCESS_KEY_ID;

const dbUrl = process.env.DATABASE_URL;

const config = {
  secret: process.env.JWT_SECRET,
  auth_token: process.env.GITHUB_TOKEN,
};
```

All secrets come from environment variables. Use a `.env` file locally (never committed) and a secret manager in production.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `severity` | string | `"error"` | Severity level: `"info"`, `"warning"`, or `"error"`. Default is `error` (highest). |

**Sample output**:

```
[error] src/config/database.ts:1
  Hardcoded secret detected

[error] src/config/database.ts:4
  Connection string with embedded credentials detected

[error] src/config/database.ts:3
  AWS access key detected
```

The sniffer matches three distinct patterns:

| Pattern | What it catches |
|---|---|
| `HARDCODED_SECRET` | Assignments like `password = '...'`, `api_key: '...'`, `secret = '...'`, `token = '...'` where the value is a string of 4+ characters. |
| `AWS_ACCESS_KEY` | Strings matching the AWS access key format: `AKIA` followed by 16 uppercase alphanumeric characters. |
| `CONNECTION_STRING_WITH_CREDS` | URIs like `mongodb://user:pass@host`, `postgres://admin:secret@db`, `redis://default:pw@cache`. |
