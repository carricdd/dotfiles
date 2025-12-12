#!/bin/bash
# API Authentication Reference - STOP GUESSING!
# Last updated: 2025-12-09

source ~/.zsh_env

###############################################################################
# CARBON BLACK CLOUD
# Docs: https://developer.carbonblack.com/reference/carbon-black-cloud/authentication/
###############################################################################
# Auth Header: X-Auth-Token: {API_SECRET_KEY}/{API_ID}
# - API_SECRET_KEY = CB_APIKEY - alphanumeric string like "HF8Y97NDJL3YWKA3BLZEUJGG"
# - API_ID = CB_APPID (short string, ~10 chars like "IAI5US4G2P")
#
# VERIFIED WORKING: 2025-12-09
# Format confirmed: ${CB_APIKEY}/${CB_APPID}
#
# To get proper API credentials:
#   1. CB Console → Settings → API Access
#   2. Create new API Key (Custom access level)
#   3. Copy the API Secret Key (NOT from browser session!)
#
# Example:
#   curl -H "X-Auth-Token: ${CB_APIKEY}/${CB_APPID}" \
#        "${CB_URL}/api/alerts/v7/orgs/${CB_ORGKEY}/alerts/_search"
#
# URL Path uses ORGKEY (like "7RZFLGY3"), NOT ORGID (numeric)
# LifeScan CB: ORGKEY=7RZFLGY3, URL=https://defense-prod05.conferdeploy.net
###############################################################################

cb_test() {
    echo "=== Carbon Black Cloud Test ==="
    echo "URL: $CB_URL"
    echo "ORG: $CB_ORGKEY"

    curl -s -X POST "${CB_URL}/api/alerts/v7/orgs/${CB_ORGKEY}/alerts/_search" \
        -H "X-Auth-Token: ${CB_APIKEY}/${CB_APPID}" \
        -H "Content-Type: application/json" \
        -d '{"rows": 5}' | jq '.num_found // .'
}

###############################################################################
# EXPEL WORKBENCH
# Docs: https://expel.io/docs/api/
###############################################################################
# Auth Header: Authorization: Bearer {API_KEY}
# Content-Type: application/vnd.api+json
#
# Example:
#   curl -H "Authorization: Bearer ${LIFESCAN_EXPEL_APIKEY}" \
#        -H "Content-Type: application/vnd.api+json" \
#        "https://workbench.expel.io/api/v2/expel_alerts"
###############################################################################

expel_test() {
    echo "=== Expel Workbench Test ==="
    curl -s "https://workbench.expel.io/api/v2/organizations" \
        -H "Authorization: Bearer ${LIFESCAN_EXPEL_APIKEY}" \
        -H "Content-Type: application/vnd.api+json" | jq '.data[0].attributes.name // .'
}

###############################################################################
# MERAKI DASHBOARD
# Docs: https://developer.cisco.com/meraki/api-v1/
###############################################################################
# Auth Header: X-Cisco-Meraki-API-Key: {API_KEY}
# OR: Authorization: Bearer {API_KEY}
#
# LifeScan Org ID: 610237749508702530
# CGL Org ID: 1251945
###############################################################################

meraki_test() {
    echo "=== Meraki API Test ==="
    echo "Testing LifeScan org..."
    curl -s "https://api.meraki.com/api/v1/organizations/610237749508702530" \
        -H "X-Cisco-Meraki-API-Key: ${LIFESCAN_MERAKI_APIKEY}" | jq '.name // .'
}

###############################################################################
# AZURE MONITOR INGESTION (DCE/DCR)
# Docs: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-ingestion-api-overview
###############################################################################
# Auth: Bearer token from az CLI
# Token Resource: https://monitor.azure.com
#
# Example:
#   TOKEN=$(az account get-access-token --resource="https://monitor.azure.com" --query accessToken -o tsv)
#   curl -X POST "${DCE_URL}/dataCollectionRules/${DCR_ID}/streams/${STREAM}?api-version=2023-01-01" \
#        -H "Authorization: Bearer ${TOKEN}" \
#        -H "Content-Type: application/json" \
#        -d @data.json
###############################################################################

# Run all tests
if [[ "$1" == "test" ]]; then
    cb_test
    echo ""
    expel_test
    echo ""
    meraki_test
fi
