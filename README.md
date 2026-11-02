# CampusConnect Microservices — Lab 8

> **Lab 7 → Lab 8 progression:** Kubernetes orchestration, GitHub Actions CI/CD, and Prometheus/Grafana monitoring added on top of the existing microservices application.

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Quick Start — kind (local Kubernetes)](#4-quick-start--kind-local-kubernetes)
5. [Kubernetes Manifests](#5-kubernetes-manifests)
6. [ConfigMap & Secret](#6-configmap--secret)
7. [Applying Manifests & Verifying Resources](#7-applying-manifests--verifying-resources)
8. [Accessing & Testing the Gateway](#8-accessing--testing-the-gateway)
9. [Scaling & Self-Healing](#9-scaling--self-healing)
10. [GitHub Actions CI/CD](#10-github-actions-cicd)
11. [Prometheus Monitoring](#11-prometheus-monitoring)
12. [Grafana Dashboard](#12-grafana-dashboard)
13. [Troubleshooting](#13-troubleshooting)
14. [Security Notes](#14-security-notes)

---

## 1. Application Overview

**CampusConnect** is a microservices application composed of four services:

| Service | Description | Port |
|---|---|---|
| **API Gateway** | Single client-facing entry point; routes `/users`, `/products`, `/orders` | 8080 |
| **User Service** | CRUD for user resources; backed by MongoDB Atlas | 3001 |
| **Product Service** | CRUD for product resources; backed by MongoDB Atlas | 3002 |
| **Order Service** | CRUD for orders; validates users + products at request-time | 3003 |

**Database:** MongoDB Atlas (external managed; not deployed inside Kubernetes).

**Lab 7 starting point:** Docker Compose with all four services on a shared `campus-network`.  
**Lab 8 goal:** Deploy on Kubernetes (kind), add CI/CD and monitoring.

---

## 2. Architecture

```
Client / Postman
      │
      ▼  NodePort 30080
┌─────────────────┐
│   API Gateway   │  api-gateway Service (ClusterIP :8080 internally)
└────────┬────────┘
         │  Kubernetes Service DNS names (never Pod IPs)
    ┌────┼────┬──────────┐
    ▼    ▼    ▼          ▼
┌──────┐ ┌──────────┐ ┌──────────┐
│ User │ │ Product  │ │  Order   │
│ Svc  │ │  Svc     │ │  Svc     │
│ :3001│ │  :3002   │ │  :3003   │
└──┬───┘ └────┬─────┘ └────┬─────┘
   │          │             │
   └──────────┴─────────────┘
              │
         MongoDB Atlas
         (external, TLS)

Monitoring (same namespace):
  Prometheus :9090  ──scrapes──▶ all four services /metrics
  Grafana    :3000  ──reads───▶  Prometheus
```

**Container Registry:** `docker.io/sagar9800/<service>:<sha>`  
**CI/CD:** GitHub Actions → Docker Hub → `kubectl rollout`

---

## 3. Prerequisites

- **Docker Desktop** (with WSL2 backend on Windows)
- **kind** — `choco install kind` or https://kind.sigs.k8s.io/docs/user/quick-start/
- **kubectl** — `choco install kubernetes-cli`
- **Git** + a GitHub account (username: `sagar-dot-bera`)
- **Postman** for API testing
- Docker Hub account (`sagar9800`)

---

## 4. Quick Start — kind (local Kubernetes)

### 4.1 Create a kind cluster with NodePort support

```bash
# kind-config.yaml is optional but recommended for NodePort mapping
cat <<EOF | kind create cluster --name kind --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30080
    hostPort: 30080
    protocol: TCP
  - containerPort: 30090
    hostPort: 30090
    protocol: TCP
  - containerPort: 30030
    hostPort: 30030
    protocol: TCP
EOF
```

> After creation, `kubectl config current-context` should return `kind-kind`.

### 4.2 Verify the cluster

```bash
kubectl config current-context   # kind-kind
kubectl get nodes                # should show 1 Ready node
```

### 4.3 Run the bootstrap script

The `deploy-lab8.sh` script builds images, loads them into kind, creates the namespace+secret, and applies all manifests.

```bash
# Set your real MongoDB Atlas URIs (keep them secret!)
export USER_MONGODB_URI="mongodb+srv://sagar:<password>@cluster0.27kxnnp.mongodb.net/userdb"
export PRODUCT_MONGODB_URI="mongodb+srv://sagar:<password>@cluster0.27kxnnp.mongodb.net/productdb"
export ORDER_MONGODB_URI="mongodb+srv://sagar:<password>@cluster0.27kxnnp.mongodb.net/orderdb"

bash deploy-lab8.sh
```

### 4.4 Access the services

| Service | URL |
|---|---|
| API Gateway | `http://localhost:30080` |
| Prometheus | `http://localhost:30090` |
| Grafana | `http://localhost:30030` (admin/admin) |

---

## 5. Kubernetes Manifests

All manifests live in `k8s/`:

```
k8s/
├── configmap.yaml            # Non-sensitive config (ports, service URLs, timeouts)
├── secret.yaml.example       # Template — real Secret created imperatively
├── gateway-deployment.yaml   # API Gateway Deployment
├── gateway-service.yaml      # API Gateway Service (NodePort 30080)
├── user-deployment.yaml      # User Service Deployment
├── user-service.yaml         # User Service (ClusterIP)
├── product-deployment.yaml   # Product Service Deployment
├── product-service.yaml      # Product Service (ClusterIP)
├── order-deployment.yaml     # Order Service Deployment
├── order-service.yaml        # Order Service (ClusterIP)
├── prometheus-configmap.yaml # Prometheus scrape config
├── prometheus.yaml           # Prometheus Deployment + Service (NodePort 30090)
└── grafana.yaml              # Grafana Deployment + Service (NodePort 30030)
```

**Health & Readiness Probes** are configured on every Deployment:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: <service-port>
  initialDelaySeconds: 30
  periodSeconds: 20
readinessProbe:
  httpGet:
    path: /health
    port: <service-port>
  initialDelaySeconds: 15
  periodSeconds: 10
```

- **Liveness** — restarts the container if the application hangs
- **Readiness** — removes the Pod from Service endpoints during startup and rolling updates (especially important since `/health` returns 503 until MongoDB is connected)

---

## 6. ConfigMap & Secret

### ConfigMap (`campusconnect-config`)

Stores non-sensitive values only:

| Key | Value |
|---|---|
| `GATEWAY_PORT` | `8080` |
| `USER_SERVICE_PORT` | `3001` |
| `PRODUCT_SERVICE_PORT` | `3002` |
| `ORDER_SERVICE_PORT` | `3003` |
| `USER_SERVICE_URL` | `http://user-service:3001` |
| `PRODUCT_SERVICE_URL` | `http://product-service:3002` |
| `ORDER_SERVICE_URL` | `http://order-service:3003` |
| `GATEWAY_PROXY_TIMEOUT_MS` | `10000` |
| `DEPENDENCY_TIMEOUT_MS` | `3000` |

### Secret (`mongodb-secret`) — Created imperatively, NEVER committed

```bash
kubectl create secret generic mongodb-secret \
  --from-literal=USER_MONGODB_URI="mongodb+srv://..." \
  --from-literal=PRODUCT_MONGODB_URI="mongodb+srv://..." \
  --from-literal=ORDER_MONGODB_URI="mongodb+srv://..." \
  -n lab8
```

> **Security:** The actual Secret YAML is in `.gitignore`. Only the template (`secret.yaml.example`) is committed.

---

## 7. Applying Manifests & Verifying Resources

```bash
# Create namespace
kubectl create namespace lab8

# Create the MongoDB secret (see §6)

# Apply all manifests
kubectl apply -f k8s/ -n lab8

# Verify
kubectl get deployments -n lab8
kubectl get pods -n lab8
kubectl get services -n lab8
kubectl get configmap -n lab8
```

Expected output — all Deployments `READY`:
```
NAME              READY   UP-TO-DATE   AVAILABLE
api-gateway       1/1     1            1
user-service      1/1     1            1
product-service   1/1     1            1
order-service     1/1     1            1
prometheus        1/1     1            1
grafana           1/1     1            1
```

---

## 8. Accessing & Testing the Gateway

With the kind cluster's NodePort mapped to `localhost`:

```bash
# Gateway health
curl http://localhost:30080/health

# All services health (aggregate)
curl http://localhost:30080/health/services

# Users
curl http://localhost:30080/users
curl -X POST http://localhost:30080/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@campus.edu"}'

# Products
curl http://localhost:30080/products
curl -X POST http://localhost:30080/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":999}'

# Orders
curl http://localhost:30080/orders
```

---

## 9. Scaling & Self-Healing

### Scale User Service to 3 replicas

```bash
kubectl scale deployment user-service --replicas=3 -n lab8
kubectl get pods -n lab8    # should show 3 user-service-* pods
```

The Service (`user-service`) automatically load-balances across all three replicas.

### Self-Healing demonstration

```bash
# List pods and pick a user-service pod
kubectl get pods -n lab8

# Delete it
kubectl delete pod <user-service-pod-name> -n lab8

# Watch Kubernetes immediately replace it
kubectl get pods -n lab8 -w
```

The Deployment controller detects that the desired replica count (3) differs from the current count and immediately schedules a replacement Pod.

---

## 10. GitHub Actions CI/CD

**Workflow file:** `.github/workflows/ci.yml`

### Pipeline stages

```
Git Push to main
    │
    ▼
Job 1: build-test (matrix: 4 services)
    ├── actions/checkout@v4
    ├── setup-node@v4 (Node 22)
    ├── npm ci --omit=dev
    └── npm test (skipped if no test script)
    │
    ▼ (on push only)
Job 2: docker-build (matrix: 4 services)
    ├── docker/login-action (Docker Hub)
    ├── docker/metadata-action (SHA tag + latest)
    └── docker/build-push-action → sagar9800/<service>:sha-<SHA>
    │
    ▼
Job 3: k8s-deploy
    ├── kubectl apply manifests
    ├── kubectl set image (per service, SHA tag)
    └── kubectl rollout status (waits for success)
```

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret name | Description |
|---|---|
| `DOCKERHUB_USERNAME` | `sagar9800` |
| `DOCKERHUB_TOKEN` | Docker Hub access token (not password) |
| `KUBE_CONFIG` | `base64 -w0 ~/.kube/config` output |
| `MONGODB_USER_URI` | Full MongoDB Atlas URI for user-service |
| `MONGODB_PRODUCT_URI` | Full MongoDB Atlas URI for product-service |
| `MONGODB_ORDER_URI` | Full MongoDB Atlas URI for order-service |

### Image tagging strategy

Images are tagged with the Git commit SHA for full traceability:

```
docker.io/sagar9800/api-gateway:sha-a1b2c3d
docker.io/sagar9800/api-gateway:latest
```

---

## 11. Prometheus Monitoring

**URL:** `http://localhost:30090`

### Scrape targets (configured in `k8s/prometheus-configmap.yaml`)

| Job | Target |
|---|---|
| `api-gateway` | `api-gateway:8080/metrics` |
| `user-service` | `user-service:3001/metrics` |
| `product-service` | `product-service:3002/metrics` |
| `order-service` | `order-service:3003/metrics` |
| `prometheus` | `localhost:9090/metrics` |

### Useful PromQL queries

```promql
# Are all targets UP?
up

# HTTP request rate over 5 minutes
rate(http_requests_total[5m])

# Error rate (5xx)
rate(http_requests_total{status=~"5.."}[5m])

# Average request latency
rate(http_request_duration_seconds_sum[5m])
  / rate(http_request_duration_seconds_count[5m])

# Kubernetes Pod readiness (if kube-state-metrics available)
kube_deployment_status_replicas_available{namespace="lab8"}
```

> **Note:** If the application does not natively expose `/metrics`, Prometheus will still scrape Prometheus self-metrics and Node/kube metrics. The `up` metric always shows target reachability.

---

## 12. Grafana Dashboard

**URL:** `http://localhost:30030`  
**Login:** `admin` / `admin`

The Prometheus datasource is **auto-provisioned** — no manual setup required.

### Create the Lab 8 Dashboard

1. Click **+** → **Dashboard** → **Add visualization**
2. Select the **Prometheus** datasource
3. Add panels for:

| Panel | Query | Purpose |
|---|---|---|
| Targets UP | `up` | Availability |
| Request Rate | `rate(http_requests_total[5m])` | Traffic |
| Error Rate | `rate(http_requests_total{status=~"5.."}[5m])` | Errors |
| Latency p50 | `histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m]))` | Latency |
| Pod Restarts | `increase(kube_pod_container_status_restarts_total{namespace="lab8"}[1h])` | Stability |

### Generate traffic for observation

```bash
# Send 20 requests to different endpoints
for i in $(seq 1 20); do
  curl -s http://localhost:30080/health > /dev/null
  curl -s http://localhost:30080/users > /dev/null
  curl -s http://localhost:30080/products > /dev/null
  curl -s http://localhost:30080/orders > /dev/null
done
```

Observe the Request Rate panel updating in Grafana within ~15 seconds (one scrape interval).

---

## 13. Troubleshooting

### Pod not starting

```bash
kubectl describe pod <pod-name> -n lab8
kubectl logs <pod-name> -n lab8
```

Common causes:
- `ImagePullBackOff` → image not loaded into kind or wrong tag
- `CrashLoopBackOff` → check logs; often a missing env var or bad MongoDB URI
- `Pending` → check `kubectl describe pod` for scheduling errors

### Service not reachable

```bash
kubectl get endpoints -n lab8      # Check endpoints are populated
kubectl get pods -n lab8 -o wide   # Verify pods are Running
```

### MongoDB connection failing

```bash
# Verify the secret exists and has the right keys
kubectl get secret mongodb-secret -n lab8 -o yaml

# Test connectivity from inside the cluster
kubectl run -it --rm --image=curlimages/curl:8.8.0 debug-pod --restart=Never -n lab8 -- \
  sh -c "curl -s http://user-service:3001/health"
```

### Reload images after rebuild

```bash
docker build -t sagar9800/user-service:latest ./user-service
kind load docker-image sagar9800/user-service:latest --name kind
kubectl rollout restart deployment/user-service -n lab8
```

---

## 14. Security Notes

- `.env` is git-ignored — **never commit it**
- `k8s/secret.yaml` is git-ignored — only the `.example` template is committed
- MongoDB Atlas URIs are stored in GitHub Secrets and in Kubernetes Secrets only
- Docker Hub uses an **access token** (not a password)
- The KUBE_CONFIG secret is base64-encoded and decoded only during CI execution
- Only the API Gateway is exposed externally (NodePort); all backend services are ClusterIP

---

*Lab 8 — Web Services & SOA | CampusConnect Microservices on Kubernetes*
