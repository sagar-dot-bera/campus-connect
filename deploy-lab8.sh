#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-lab8.sh  — One-shot bootstrap for CampusConnect on kind
#
# Usage:
#   1. Set your real MongoDB Atlas URIs in the environment OR enter when prompted:
#        export USER_MONGODB_URI="mongodb+srv://..."
#        export PRODUCT_MONGODB_URI="mongodb+srv://..."
#        export ORDER_MONGODB_URI="mongodb+srv://..."
#   2. Run: bash deploy-lab8.sh
#
# What this script does:
#   a) Builds all four Docker images locally
#   b) Loads them into the kind cluster (no registry pull needed)
#   c) Creates the lab8 namespace
#   d) Creates the mongodb-secret from env vars
#   e) Applies all k8s manifests
#   f) Waits for all Deployments to become ready
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

NAMESPACE=lab8
REGISTRY=sagar9800
KIND_CLUSTER=kind   # default kind cluster name; change if yours differs

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   CampusConnect — Lab 8 Kubernetes Deployment Bootstrap     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── 0. Prompt for MongoDB URIs if not already set ────────────────────────────
prompt_uri() {
  local var_name=$1
  local label=$2
  if [ -z "${!var_name:-}" ]; then
    echo -n "Enter ${label} MongoDB URI: "
    read -rs value
    echo ""
    export "${var_name}=${value}"
  fi
}

prompt_uri USER_MONGODB_URI    "User Service"
prompt_uri PRODUCT_MONGODB_URI "Product Service"
prompt_uri ORDER_MONGODB_URI   "Order Service"

# ── 1. Build Docker images ────────────────────────────────────────────────────
echo ""
echo "▶  Building Docker images..."
for svc in api-gateway user-service product-service order-service; do
  echo "   • Building ${REGISTRY}/${svc}:latest ..."
  docker build -t "${REGISTRY}/${svc}:latest" "./${svc}"
done
echo "   ✓ All images built."

# ── 2. Load images into kind cluster ─────────────────────────────────────────
echo ""
echo "▶  Loading images into kind cluster '${KIND_CLUSTER}'..."
for svc in api-gateway user-service product-service order-service; do
  echo "   • Loading ${REGISTRY}/${svc}:latest ..."
  kind load docker-image "${REGISTRY}/${svc}:latest" --name "${KIND_CLUSTER}"
done
echo "   ✓ All images loaded."

# ── 3. Create namespace ───────────────────────────────────────────────────────
echo ""
echo "▶  Creating namespace '${NAMESPACE}'..."
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
echo "   ✓ Namespace ready."

# ── 4. Create MongoDB Secret ──────────────────────────────────────────────────
echo ""
echo "▶  Creating MongoDB Secret in namespace '${NAMESPACE}'..."
kubectl create secret generic mongodb-secret \
  --from-literal=USER_MONGODB_URI="${USER_MONGODB_URI}" \
  --from-literal=PRODUCT_MONGODB_URI="${PRODUCT_MONGODB_URI}" \
  --from-literal=ORDER_MONGODB_URI="${ORDER_MONGODB_URI}" \
  --namespace "${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -
echo "   ✓ Secret applied."

# ── 5. Apply manifests ────────────────────────────────────────────────────────
echo ""
echo "▶  Applying Kubernetes manifests..."
kubectl apply -f k8s/configmap.yaml          -n "${NAMESPACE}"
kubectl apply -f k8s/gateway-deployment.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/gateway-service.yaml    -n "${NAMESPACE}"
kubectl apply -f k8s/user-deployment.yaml    -n "${NAMESPACE}"
kubectl apply -f k8s/user-service.yaml       -n "${NAMESPACE}"
kubectl apply -f k8s/product-deployment.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/product-service.yaml    -n "${NAMESPACE}"
kubectl apply -f k8s/order-deployment.yaml   -n "${NAMESPACE}"
kubectl apply -f k8s/order-service.yaml      -n "${NAMESPACE}"
kubectl apply -f k8s/prometheus-configmap.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/prometheus.yaml         -n "${NAMESPACE}"
kubectl apply -f k8s/grafana.yaml            -n "${NAMESPACE}"
echo "   ✓ Manifests applied."

# ── 6. Wait for Deployments ───────────────────────────────────────────────────
echo ""
echo "▶  Waiting for all Deployments to become ready (timeout 3m each)..."
for dep in api-gateway user-service product-service order-service prometheus grafana; do
  echo -n "   • Waiting for deployment/${dep} ... "
  kubectl rollout status "deployment/${dep}" -n "${NAMESPACE}" --timeout=180s
done

# ── 7. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE"
echo "══════════════════════════════════════════════════════════════"
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo ""
echo "  Service      URL"
echo "  ─────────────────────────────────────────────────────────"
echo "  API Gateway  http://${NODE_IP}:30080"
echo "  Prometheus   http://${NODE_IP}:30090"
echo "  Grafana      http://${NODE_IP}:30030  (admin / admin)"
echo ""
echo "  Quick health check:"
echo "    curl http://${NODE_IP}:30080/health"
echo ""
echo "  Scale user-service to 3 replicas:"
echo "    kubectl scale deployment user-service --replicas=3 -n ${NAMESPACE}"
echo ""
kubectl get pods -n "${NAMESPACE}"
