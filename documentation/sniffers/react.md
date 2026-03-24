# React Sniffers

This document covers the three React-specific sniffers: `prop-explosion`, `god-hook`, and `prop-drilling`. Each one targets a common anti-pattern that makes React components harder to maintain and test.

---

## prop-explosion

**Detects**: Components that receive too many props, either via destructured parameters or JSX attributes.

**Why it matters**: A component with many props is doing too much. It becomes hard to test, difficult to reuse, and painful to refactor. This is often a sign that the component should be split into smaller, focused pieces or that related props should be grouped into objects.

**Bad** -- gets flagged:

```tsx
function UserProfileCard({
  firstName,
  lastName,
  email,
  phone,
  avatarUrl,
  role,
  department,
  isActive,
  lastLoginDate,
  onEdit,
}: UserProfileCardProps) {
  return (
    <div className="card">
      <img src={avatarUrl} alt={`${firstName} ${lastName}`} />
      <h2>{firstName} {lastName}</h2>
      <p>{email}</p>
      <p>{phone}</p>
      <span>{role} - {department}</span>
      {isActive && <span>Active since {lastLoginDate}</span>}
      <button onClick={onEdit}>Edit</button>
    </div>
  );
}
```

This component has 10 props, well above the default threshold of 7.

**Good** -- passes:

```tsx
interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl: string;
}

interface OrgInfo {
  role: string;
  department: string;
}

function UserProfileCard({
  user,
  org,
  isActive,
  onEdit,
}: {
  user: UserInfo;
  org: OrgInfo;
  isActive: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="card">
      <UserAvatar user={user} />
      <UserDetails user={user} org={org} />
      {isActive && <ActiveBadge />}
      <button onClick={onEdit}>Edit</button>
    </div>
  );
}
```

Related props are grouped into objects (`user`, `org`) and display logic is split into sub-components.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `threshold` | number | `7` | Maximum number of props before a warning is raised. |
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/components/UserProfileCard.tsx:3
  Component "UserProfileCard" has 10 props (threshold: 7)

  Consider refactoring `UserProfileCard`:
  - Group related props into object props (e.g., `userConfig`, `handlers`)
  - Use React Context for widely-shared values
  - Split into smaller, focused components
  - Consider the Compound Components pattern
```

---

## god-hook

**Detects**: Custom hooks (functions starting with `use`) that contain too many `useState`, `useEffect`, or total hook calls.

**Why it matters**: A hook with 5+ `useState` calls and multiple `useEffect` blocks has grown beyond a single responsibility. It becomes a tangled mix of unrelated state and side effects that is hard to debug, hard to test, and easy to break when changing one piece of logic.

**Bad** -- gets flagged:

```tsx
function useUserDashboard(userId: string) {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const cachedOrders = useMemo(() => orders.filter(o => o.status === 'active'), [orders]);
  const handleDismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    fetchProfile(userId).then(setProfile);
  }, [userId]);

  useEffect(() => {
    fetchOrders(userId).then(setOrders);
  }, [userId]);

  useEffect(() => {
    fetchNotifications(userId).then(setNotifications);
  }, [userId]);

  useEffect(() => {
    fetchPreferences(userId).then(setPreferences);
  }, [userId]);

  return { profile, orders: cachedOrders, notifications, preferences, isLoading, handleDismiss };
}
```

This hook has 5 `useState`, 4 `useEffect`, and 11 total hook calls.

**Good** -- passes:

```tsx
function useUserProfile(userId: string) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile(userId).then(setProfile);
  }, [userId]);

  return profile;
}

function useUserOrders(userId: string) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders(userId).then(setOrders);
  }, [userId]);

  const activeOrders = useMemo(() => orders.filter(o => o.status === 'active'), [orders]);
  return activeOrders;
}

function useUserDashboard(userId: string) {
  const profile = useUserProfile(userId);
  const orders = useUserOrders(userId);
  return { profile, orders };
}
```

Each sub-hook owns a single piece of data and its side effect. The orchestrating hook (`useUserDashboard`) composes them without exceeding any threshold.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `maxUseState` | number | `4` | Maximum `useState` calls in one hook. |
| `maxUseEffect` | number | `3` | Maximum `useEffect` calls in one hook. |
| `maxTotalHooks` | number | `10` | Maximum total hook calls (useState + useEffect + useMemo + useCallback + useRef + useLayoutEffect). |
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |

**Sample output**:

```
[warning] src/hooks/useUserDashboard.ts:1
  Hook "useUserDashboard" has 5 useState, 4 useEffect, 11 total hook calls

  Consider splitting `useUserDashboard`:
  - Extract related state + effects into focused sub-hooks
  - Each hook should have a single responsibility
  - Use `useReducer` for complex related state
  - Extract pure data transformations outside hooks
```

---

## prop-drilling

**Detects**: Props that a component receives via destructuring but never uses locally -- it only forwards them to child components via JSX attributes like `userId={userId}`.

**Why it matters**: When a component accepts a prop only to pass it down unchanged, that component is acting as a middleman. This is called "prop drilling." It makes refactoring painful because renaming or removing a prop requires touching every component in the chain, even the ones that do not care about the value.

**Bad** -- gets flagged:

```tsx
function OrderPage({ userId, cartItems, onCheckout }: OrderPageProps) {
  return (
    <div>
      <h1>Your Order</h1>
      <OrderSummary
        userId={userId}
        cartItems={cartItems}
        onCheckout={onCheckout}
      />
    </div>
  );
}
```

`OrderPage` receives `userId`, `cartItems`, and `onCheckout` but does not read or transform any of them. It passes all three straight through to `OrderSummary`.

**Good** -- passes:

```tsx
const CartContext = createContext<CartContextValue | null>(null);

function OrderPage() {
  const { userId, cartItems, onCheckout } = useContext(CartContext);

  return (
    <div>
      <h1>Your Order</h1>
      <OrderSummary />
    </div>
  );
}

function OrderSummary() {
  const { userId, cartItems, onCheckout } = useContext(CartContext);
  // uses the values directly
  return <div>{cartItems.length} items for user {userId}</div>;
}
```

Using React Context removes the middleman. Each component reads exactly what it needs.

**Configuration**:

| Option | Type | Default | Description |
|---|---|---|---|
| `severity` | string | `"warning"` | Severity level: `"info"`, `"warning"`, or `"error"`. |
| `whitelistedProps` | string[] | `["className", "style", "children", "key", "ref", "id", "data-testid"]` | Props that are always ignored. These are common pass-through props by design. |

**Sample output**:

```
[warning] src/pages/OrderPage.tsx:1
  Component "OrderPage" passes prop "userId" through without using it

  Possible prop drilling in `OrderPage`:
  - Use React Context to provide `userId` to deeper components
  - Use component composition (children/render props)
  - Consider a state management solution
```
