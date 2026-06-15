import type { Node, Edge } from "reactflow";

export const MOCK_NODES: Node[] = [
  // ── API Layer ──────────────────────────────────────────────────────────────
  {
    id: "api-users",
    type: "apiRoute",
    position: { x: 80, y: 60 },
    data: {
      label: "User Routes",
      sublabel: "/api/users/*",
      icon: "Users",
      metrics: [
        { label: "Endpoints", value: "12" },
        { label: "Avg latency", value: "42ms" },
      ],
    },
  },
  {
    id: "api-orders",
    type: "apiRoute",
    position: { x: 320, y: 60 },
    data: {
      label: "Order Routes",
      sublabel: "/api/orders/*",
      icon: "ShoppingCart",
      metrics: [
        { label: "Endpoints", value: "8" },
        { label: "Avg latency", value: "78ms" },
      ],
    },
  },
  {
    id: "api-inventory",
    type: "apiRoute",
    position: { x: 560, y: 60 },
    data: {
      label: "Inventory Routes",
      sublabel: "/api/inventory/*",
      icon: "Package",
      metrics: [
        { label: "Endpoints", value: "6" },
        { label: "Avg latency", value: "31ms" },
      ],
    },
  },
  {
    id: "api-payments",
    type: "apiRoute",
    position: { x: 800, y: 60 },
    data: {
      label: "Payment Routes",
      sublabel: "/api/payments/*",
      icon: "CreditCard",
      metrics: [
        { label: "Endpoints", value: "5" },
        { label: "Avg latency", value: "120ms" },
      ],
    },
  },

  // ── Business Logic Layer ───────────────────────────────────────────────────
  {
    id: "svc-users",
    type: "businessLogic",
    position: { x: 80, y: 260 },
    data: {
      label: "UserService",
      sublabel: "services/user_service.py",
      icon: "Box",
      metrics: [
        { label: "Functions", value: "24" },
        { label: "Classes", value: "3" },
      ],
    },
  },
  {
    id: "svc-orders",
    type: "businessLogic",
    position: { x: 320, y: 260 },
    data: {
      label: "OrderService",
      sublabel: "services/order_service.py",
      icon: "Box",
      metrics: [
        { label: "Functions", value: "31" },
        { label: "Classes", value: "5" },
      ],
    },
  },
  {
    id: "svc-inventory",
    type: "businessLogic",
    position: { x: 560, y: 260 },
    data: {
      label: "InventoryService",
      sublabel: "services/inventory_service.py",
      icon: "Box",
      metrics: [
        { label: "Functions", value: "18" },
        { label: "Classes", value: "2" },
      ],
    },
  },
  {
    id: "svc-payments",
    type: "businessLogic",
    position: { x: 800, y: 260 },
    data: {
      label: "PaymentService",
      sublabel: "services/payment_service.py",
      icon: "Box",
      metrics: [
        { label: "Functions", value: "14" },
        { label: "Classes", value: "4" },
        { label: "Coupling score", value: "HIGH" },
      ],
    },
  },

  // ── Database Layer ─────────────────────────────────────────────────────────
  {
    id: "db-users",
    type: "database",
    position: { x: 80, y: 460 },
    data: {
      label: "users",
      sublabel: "PostgreSQL table",
      icon: "Database",
      metrics: [
        { label: "Columns", value: "18" },
        { label: "FK refs", value: "4" },
      ],
    },
  },
  {
    id: "db-orders",
    type: "database",
    position: { x: 320, y: 460 },
    data: {
      label: "orders + line_items",
      sublabel: "PostgreSQL tables",
      icon: "Database",
      metrics: [
        { label: "Columns", value: "32" },
        { label: "FK refs", value: "7" },
      ],
    },
  },
  {
    id: "db-inventory",
    type: "database",
    position: { x: 560, y: 460 },
    data: {
      label: "products + stock",
      sublabel: "PostgreSQL tables",
      icon: "Database",
      metrics: [
        { label: "Columns", value: "24" },
        { label: "FK refs", value: "3" },
      ],
    },
  },
  {
    id: "db-shared",
    type: "database",
    position: { x: 800, y: 460 },
    data: {
      label: "transactions",
      sublabel: "PostgreSQL table — shared",
      icon: "Database",
      metrics: [
        { label: "Columns", value: "21" },
        { label: "FK refs", value: "9" },
        { label: "Shared by", value: "3 services" },
      ],
    },
  },

  // ── External services ──────────────────────────────────────────────────────
  {
    id: "ext-stripe",
    type: "externalService",
    position: { x: 800, y: 660 },
    data: {
      label: "Stripe API",
      sublabel: "Payment gateway",
      icon: "Globe",
      metrics: [{ label: "Integration", value: "REST" }],
    },
  },
  {
    id: "ext-email",
    type: "externalService",
    position: { x: 320, y: 660 },
    data: {
      label: "SendGrid",
      sublabel: "Transactional email",
      icon: "Mail",
      metrics: [{ label: "Integration", value: "SMTP + API" }],
    },
  },
];

export const MOCK_EDGES: Edge[] = [
  // API → Service
  { id: "e1", source: "api-users", target: "svc-users", animated: false },
  { id: "e2", source: "api-orders", target: "svc-orders", animated: false },
  { id: "e3", source: "api-inventory", target: "svc-inventory", animated: false },
  { id: "e4", source: "api-payments", target: "svc-payments", animated: false },

  // Service → DB
  { id: "e5", source: "svc-users", target: "db-users" },
  { id: "e6", source: "svc-orders", target: "db-orders" },
  { id: "e7", source: "svc-inventory", target: "db-inventory" },
  { id: "e8", source: "svc-payments", target: "db-shared" },

  // Cross-service dependencies (the tight coupling we need to break)
  {
    id: "e9",
    source: "svc-orders",
    target: "svc-inventory",
    label: "stock check",
    style: { stroke: "hsl(38 92% 50%)", strokeDasharray: "4 4" },
    labelStyle: { fill: "hsl(38 92% 50%)", fontSize: 10 },
  },
  {
    id: "e10",
    source: "svc-orders",
    target: "svc-payments",
    label: "charge",
    style: { stroke: "hsl(38 92% 50%)", strokeDasharray: "4 4" },
    labelStyle: { fill: "hsl(38 92% 50%)", fontSize: 10 },
  },
  {
    id: "e11",
    source: "svc-orders",
    target: "svc-users",
    label: "lookup",
    style: { stroke: "hsl(38 92% 50%)", strokeDasharray: "4 4" },
    labelStyle: { fill: "hsl(38 92% 50%)", fontSize: 10 },
  },

  // Shared DB access (the real problem)
  {
    id: "e12",
    source: "svc-orders",
    target: "db-shared",
    style: { stroke: "hsl(0 72% 51%)", strokeWidth: 2 },
  },

  // External
  { id: "e13", source: "svc-payments", target: "ext-stripe" },
  { id: "e14", source: "svc-orders", target: "ext-email" },
];
