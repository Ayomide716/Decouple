import type { Node, Edge } from "reactflow";

// ── Mock: legacy e-commerce Python monolith ───────────────────────────────────
// Filename labels mirror real Python files so the demo reads authentically.

export const MOCK_NODES: Node[] = [
  // ── API / Route layer ─────────────────────────────────────────────────────
  {
    id: "route-auth",
    type: "apiRoute",
    position: { x: 60, y: 40 },
    data: {
      label: "auth_routes.py",
      sublabel: "/api/auth/*  •  8 endpoints",
      icon: "Globe",
      metrics: [
        { label: "Endpoints", value: "8" },
        { label: "Avg latency", value: "34 ms" },
      ],
    },
  },
  {
    id: "route-orders",
    type: "apiRoute",
    position: { x: 320, y: 40 },
    data: {
      label: "order_routes.py",
      sublabel: "/api/orders/*  •  11 endpoints",
      icon: "Globe",
      metrics: [
        { label: "Endpoints", value: "11" },
        { label: "Avg latency", value: "92 ms" },
      ],
    },
  },
  {
    id: "route-inventory",
    type: "apiRoute",
    position: { x: 580, y: 40 },
    data: {
      label: "inventory_routes.py",
      sublabel: "/api/inventory/*  •  6 endpoints",
      icon: "Globe",
      metrics: [
        { label: "Endpoints", value: "6" },
        { label: "Avg latency", value: "28 ms" },
      ],
    },
  },
  {
    id: "route-payments",
    type: "apiRoute",
    position: { x: 840, y: 40 },
    data: {
      label: "payment_routes.py",
      sublabel: "/api/payments/*  •  5 endpoints",
      icon: "Globe",
      metrics: [
        { label: "Endpoints", value: "5" },
        { label: "Avg latency", value: "210 ms" },
      ],
    },
  },

  // ── Service / Business Logic layer ────────────────────────────────────────
  {
    id: "svc-auth",
    type: "businessLogic",
    position: { x: 60, y: 240 },
    data: {
      label: "UserAuth.py",
      sublabel: "services/  •  JWT + sessions",
      icon: "Box",
      metrics: [
        { label: "Classes", value: "2" },
        { label: "Functions", value: "18" },
        { label: "Coupling", value: "LOW" },
      ],
    },
  },
  {
    id: "svc-orders",
    type: "businessLogic",
    position: { x: 320, y: 240 },
    data: {
      label: "OrderService.py",
      sublabel: "services/  •  core domain",
      icon: "Box",
      metrics: [
        { label: "Classes", value: "4" },
        { label: "Functions", value: "37" },
        { label: "Coupling", value: "HIGH" },
      ],
    },
  },
  {
    id: "svc-inventory",
    type: "businessLogic",
    position: { x: 580, y: 240 },
    data: {
      label: "InventoryService.py",
      sublabel: "services/  •  stock & SKUs",
      icon: "Box",
      metrics: [
        { label: "Classes", value: "3" },
        { label: "Functions", value: "22" },
        { label: "Coupling", value: "MEDIUM" },
      ],
    },
  },
  {
    id: "svc-payments",
    type: "businessLogic",
    position: { x: 840, y: 240 },
    data: {
      label: "StripeIntegration.py",
      sublabel: "services/  •  billing & refunds",
      icon: "Box",
      metrics: [
        { label: "Classes", value: "3" },
        { label: "Functions", value: "14" },
        { label: "Coupling", value: "MEDIUM" },
      ],
    },
  },
  {
    id: "svc-notifications",
    type: "businessLogic",
    position: { x: 1100, y: 240 },
    data: {
      label: "NotificationService.py",
      sublabel: "services/  •  email & push",
      icon: "Box",
      metrics: [
        { label: "Classes", value: "2" },
        { label: "Functions", value: "9" },
        { label: "Coupling", value: "LOW" },
      ],
    },
  },

  // ── Data / Model layer ────────────────────────────────────────────────────
  {
    id: "db-users",
    type: "database",
    position: { x: 60, y: 450 },
    data: {
      label: "User  +  Session",
      sublabel: "models/user.py  •  PostgreSQL",
      icon: "Database",
      metrics: [
        { label: "Columns", value: "21" },
        { label: "FK refs", value: "3" },
      ],
    },
  },
  {
    id: "db-orders",
    type: "database",
    position: { x: 320, y: 450 },
    data: {
      label: "Order  +  LineItem",
      sublabel: "models/order.py  •  PostgreSQL",
      icon: "Database",
      metrics: [
        { label: "Columns", value: "38" },
        { label: "FK refs", value: "8" },
      ],
    },
  },
  {
    id: "db-products",
    type: "database",
    position: { x: 580, y: 450 },
    data: {
      label: "Product  +  Stock",
      sublabel: "models/product.py  •  PostgreSQL",
      icon: "Database",
      metrics: [
        { label: "Columns", value: "29" },
        { label: "FK refs", value: "4" },
      ],
    },
  },
  {
    id: "db-transactions",
    type: "database",
    position: { x: 840, y: 450 },
    data: {
      label: "Transaction  ⚠ shared",
      sublabel: "models/billing.py  •  accessed by 3 services",
      icon: "Database",
      metrics: [
        { label: "Columns", value: "24" },
        { label: "FK refs", value: "11" },
        { label: "Risk", value: "HIGH" },
      ],
    },
  },

  // ── External services ─────────────────────────────────────────────────────
  {
    id: "ext-stripe",
    type: "externalService",
    position: { x: 840, y: 650 },
    data: {
      label: "Stripe API",
      sublabel: "api.stripe.com  •  REST",
      icon: "Globe",
      metrics: [{ label: "SDK", value: "stripe-python" }],
    },
  },
  {
    id: "ext-sendgrid",
    type: "externalService",
    position: { x: 1100, y: 450 },
    data: {
      label: "SendGrid",
      sublabel: "Transactional email",
      icon: "Mail",
      metrics: [{ label: "SDK", value: "sendgrid-python" }],
    },
  },
  {
    id: "ext-redis",
    type: "externalService",
    position: { x: 60, y: 650 },
    data: {
      label: "Redis Cache",
      sublabel: "Session store  •  rate limiting",
      icon: "Package",
      metrics: [{ label: "Library", value: "redis-py" }],
    },
  },
];

export const MOCK_EDGES: Edge[] = [
  // Route → Service (vertical, clean)
  { id: "e-ra-sa",  source: "route-auth",      target: "svc-auth" },
  { id: "e-ro-so",  source: "route-orders",    target: "svc-orders" },
  { id: "e-ri-si",  source: "route-inventory", target: "svc-inventory" },
  { id: "e-rp-sp",  source: "route-payments",  target: "svc-payments" },

  // Service → DB (ownership)
  { id: "e-sa-du",  source: "svc-auth",      target: "db-users" },
  { id: "e-so-do",  source: "svc-orders",    target: "db-orders" },
  { id: "e-si-dp",  source: "svc-inventory", target: "db-products" },
  { id: "e-sp-dt",  source: "svc-payments",  target: "db-transactions" },

  // Cross-service coupling (amber dashes = the tight coupling to break)
  {
    id: "e-so-si",
    source: "svc-orders",
    target: "svc-inventory",
    label: "stock check",
    style: { stroke: "hsl(38 92% 50%)", strokeDasharray: "5 4" },
    labelStyle: { fill: "hsl(38 92% 50%)", fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: "hsl(222 47% 8%)", fillOpacity: 0.85 },
  },
  {
    id: "e-so-sp",
    source: "svc-orders",
    target: "svc-payments",
    label: "charge",
    style: { stroke: "hsl(38 92% 50%)", strokeDasharray: "5 4" },
    labelStyle: { fill: "hsl(38 92% 50%)", fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: "hsl(222 47% 8%)", fillOpacity: 0.85 },
  },
  {
    id: "e-so-sn",
    source: "svc-orders",
    target: "svc-notifications",
    label: "order email",
    style: { stroke: "hsl(38 92% 50%)", strokeDasharray: "5 4" },
    labelStyle: { fill: "hsl(38 92% 50%)", fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: "hsl(222 47% 8%)", fillOpacity: 0.85 },
  },
  {
    id: "e-sa-si",
    source: "svc-auth",
    target: "svc-orders",
    label: "user lookup",
    style: { stroke: "hsl(38 92% 50%)", strokeDasharray: "5 4" },
    labelStyle: { fill: "hsl(38 92% 50%)", fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: "hsl(222 47% 8%)", fillOpacity: 0.85 },
  },

  // Shared DB access (red = anti-pattern)
  {
    id: "e-so-dt",
    source: "svc-orders",
    target: "db-transactions",
    style: { stroke: "hsl(0 72% 51%)", strokeWidth: 2 },
  },
  {
    id: "e-si-dt",
    source: "svc-inventory",
    target: "db-transactions",
    style: { stroke: "hsl(0 72% 51%)", strokeWidth: 2 },
  },

  // External integrations
  { id: "e-sp-stripe",    source: "svc-payments",      target: "ext-stripe" },
  { id: "e-sn-sendgrid",  source: "svc-notifications", target: "ext-sendgrid" },
  { id: "e-sa-redis",     source: "svc-auth",          target: "ext-redis" },
];
