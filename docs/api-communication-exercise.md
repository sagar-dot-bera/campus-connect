# Microservices API and Communication Exercise (Lab 6, Section 16)

## Service design table

| Item | User Service | Product Service | Order Service |
|---|---|---|---|
| Responsibility | Manage campus users (create, read, update, delete). Single source of truth for user identity. | Manage the product catalogue (name, category, price, stock). Single source of truth for product data. | Create and retrieve orders. Validates the referenced user and product by calling their services over REST, then stores the order with a snapshot of the user and product data it needs. |
| Port | :3001 | :3002 | :3003 |
| Compose service / hostname | `user-service` | `product-service` | `order-service` |
| Main resources | Users | Products | Orders |
| Key endpoints | `GET /users`, `GET /users/{id}`, `POST /users`, `PUT /users/{id}`, `PATCH /users/{id}`, `DELETE /users/{id}` | `GET /products`, `GET /products/{id}`, `POST /products`, `PUT /products/{id}`, `DELETE /products/{id}` | `POST /orders`, `GET /orders`, `GET /orders?userId={id}`, `GET /orders/{id}` |
| Health check | `GET /health` | `GET /health` | `GET /health` |
| Data/database | User-owned: MongoDB container `user-db`, database `userdb`, volume `user-data` | Product-owned: MongoDB container `product-db`, database `productdb`, volume `product-data` | Order-owned: MongoDB container `order-db`, database `orderdb`, volume `order-data` |
| Depends on (runtime) | – | – | User Service, Product Service (REST only) |

## Service-to-service call

| Field | Design |
|---|---|
| Calling service | Order Service (`POST /orders`) |
| Target service | User Service, then Product Service |
| HTTP method | `GET` |
| Endpoint | `http://user-service:3001/users/{userId}` (`USER_SERVICE_URL`) and `http://product-service:3002/products/{productId}` (`PRODUCT_SERVICE_URL`) |
| Request data | `userId` and `productId` taken from the order request body `{ "userId", "productId", "quantity" }` |
| Expected response | `200` with the requested user / product JSON. Order Service then checks `stock >= quantity`, stores the order with `userName`, `productName`, `unitPrice`, `totalPrice`, and returns `201 Created`. |
| Failure response | `404` + `{"error":"User not found","dependency":"user-service"}` (or `Product not found`) when the referenced resource does not exist. `503` + `{"error":"user-service is unavailable (...)","dependency":"user-service"}` when the dependency cannot be reached or does not answer within `DEPENDENCY_TIMEOUT_MS` (3000 ms). `502` if the dependency answers with an unexpected status. `400` for a malformed body or insufficient stock. |
| Timeout | `AbortSignal.timeout(DEPENDENCY_TIMEOUT_MS)` on every outgoing `fetch`, so a request never hangs |
