#!/usr/bin/env python3
"""
Apache Superset 6.1.0 - Create Chart via REST API (POST /api/v1/chart/)
Official Reference: https://superset.apache.org/developer-docs/api/create-a-new-chart/
Author: Francesco Castaldi
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, Optional

try:
    import requests
except ImportError:
    print("[ERROR] Il pacchetto 'requests' non e installato. Esegui: pip install requests")
    sys.exit(1)


PROTECTED_DASHBOARDS = [2, 3, 4, 5]

DEFAULT_HEALTHCARE_CONFIG = {
    "hierarchyType": "multi_dimension",
    "groupby": ["region", "district", "site", "department"],
    "metrics": ["ricoveri", "tasso_occupazione"],
    "hierarchyHeaderLabel": "Struttura Sanitaria",
    "theme": "stratum-warm",
    "zebra": True,
    "rowDensity": "compact",
    "showGrandTotal": True,
    "showSubtotals": True,
    "valueDisplayMode": "both",
    "privacyThreshold": 5,
    "enablePrivacySuppression": True,
    "enableVirtualization": True,
    "virtualizationThreshold": 100,
    "pageSize": 50,
}

DEFAULT_SALES_CONFIG = {
    "hierarchyType": "multi_dimension",
    "groupby": ["macro_area", "paese", "categoria", "prodotto"],
    "columns": ["trimestre", "canale"],
    "metrics": ["fatturato", "margine_pct"],
    "hierarchyHeaderLabel": "Gerarchia Commerciale",
    "theme": "standard",
    "zebra": True,
    "showGrandTotal": True,
    "showSubtotals": True,
    "valueDisplayMode": "values",
    "minMaxDisplayMode": "bipolar_data_bars",
}


def build_chart_payload(
    slice_name: str,
    datasource_id: int,
    datasource_type: str,
    form_data: Dict[str, Any],
    description: str = "Hierarchical Table Chart created via REST API",
    dashboard_id: Optional[int] = None,
    cache_timeout: Optional[int] = None,
) -> Dict[str, Any]:
    """Costruisce il payload ChartPostSchema secondo le specifiche ufficiali di Apache Superset."""
    normalized_form_data = {
        **form_data,
        "viz_type": "hierarchical_table",
        "datasource": f"{datasource_id}__{datasource_type}",
    }

    hierarchy_type = form_data.get("hierarchyType", "multi_dimension")
    if hierarchy_type == "multi_dimension":
        row_dims = form_data.get("groupby") or form_data.get("hierarchyDimensions") or []
        pivot_dims = form_data.get("columns") or form_data.get("pivot_columns") or []
        query_columns = list(dict.fromkeys(row_dims + pivot_dims))
    else:
        query_columns = [c for c in [form_data.get("idColumn"), form_data.get("parentIdColumn"), form_data.get("labelColumn")] if c]

    metrics = form_data.get("metrics") or []

    query_context = {
        "datasource": {
            "id": datasource_id,
            "type": datasource_type,
        },
        "force": False,
        "queries": [
            {
                "columns": query_columns,
                "metrics": metrics,
                "filters": [],
                "order_desc": True,
            }
        ],
        "result_format": "json",
        "result_type": "full",
    }

    payload: Dict[str, Any] = {
        "slice_name": slice_name,
        "datasource_id": datasource_id,
        "datasource_type": datasource_type,
        "viz_type": "hierarchical_table",
        "description": description,
        "params": json.dumps(normalized_form_data, ensure_ascii=False),
        "query_context": json.dumps(query_context, ensure_ascii=False),
    }

    if dashboard_id:
        payload["dashboards"] = [dashboard_id]

    if cache_timeout:
        payload["cache_timeout"] = cache_timeout

    return payload


def authenticate(
    session: requests.Session,
    base_url: str,
    username: str,
    password: str,
) -> str:
    """Esegue login su Superset e restituisce il JWT Access Token."""
    login_url = f"{base_url.rstrip('/')}/api/v1/security/login"
    login_data = {
        "username": username,
        "password": password,
        "provider": "db",
        "refresh": True,
    }

    resp = session.post(login_url, json=login_data, timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(f"Autenticazione fallita ({resp.status_code}): {resp.text}")

    token = resp.json().get("access_token")
    if not token:
        raise RuntimeError("Nessun access_token restituito dall'endpoint di login.")
    return token


def fetch_csrf_token(session: requests.Session, base_url: str) -> Optional[str]:
    """Recupera il CSRF Token se l'istanza Superset ne richiede l'uso."""
    csrf_url = f"{base_url.rstrip('/')}/api/v1/security/csrf_token/"
    try:
        resp = session.get(csrf_url, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("result")
    except Exception:
        pass
    return None


def create_chart_api(
    base_url: str,
    payload: Dict[str, Any],
    token: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
) -> Dict[str, Any]:
    """Invia la richiesta POST /api/v1/chart/ a Superset."""
    session = requests.Session()

    if not token:
        if not username or not password:
            raise ValueError("Specificare --token oppure --username e --password.")
        token = authenticate(session, base_url, username, password)

    session.headers.update({"Authorization": f"Bearer {token}"})

    csrf_token = fetch_csrf_token(session, base_url)
    if csrf_token:
        session.headers.update({"X-CSRFToken": csrf_token})

    chart_url = f"{base_url.rstrip('/')}/api/v1/chart/"
    resp = session.post(chart_url, json=payload, timeout=20)

    if resp.status_code == 201:
        res_json = resp.json()
        chart_id = res_json.get("id")
        return {
            "success": True,
            "chart_id": chart_id,
            "explore_url": f"{base_url.rstrip('/')}/explore/?slice_id={chart_id}",
            "response": res_json,
        }
    else:
        return {
            "success": False,
            "status_code": resp.status_code,
            "error": resp.text,
        }


def main():
    parser = argparse.ArgumentParser(
        description="Crea un chart Hierarchical Table su Apache Superset tramite REST API (POST /api/v1/chart/)."
    )
    parser.add_argument("--url", default="http://localhost:8088", help="Base URL of Apache Superset (default: http://localhost:8088)")
    parser.add_argument("--username", default="admin", help="Username per il login Superset (default: admin)")
    parser.add_argument("--password", default=None, help="Password per il login Superset")
    parser.add_argument("--token", default=None, help="Bearer token JWT alternativo al login con password")
    parser.add_argument("--dataset-id", type=int, default=1, help="ID numerico del dataset Superset (default: 1)")
    parser.add_argument("--dataset-type", default="table", choices=["table", "dataset", "query"], help="Tipo di datasource (default: table)")
    parser.add_argument("--chart-name", default="StratumTree - Hierarchical Table", help="Nome del chart (slice_name)")
    parser.add_argument("--description", default="Hierarchical Table Chart created via REST API", help="Descrizione del chart")
    parser.add_argument("--preset", choices=["healthcare", "sales"], default="healthcare", help="Preset di configurazione (healthcare o sales)")
    parser.add_argument("--config-file", help="File JSON opzionale contenente parametri formData personalizzati")
    parser.add_argument("--dashboard-id", type=int, help="ID opzionale della dashboard a cui agganciare il chart")
    parser.add_argument("--force-protected-dashboard", action="store_true", help="Force the association even on protected dashboards (2, 3, 4, 5)")
    parser.add_argument("--dry-run", action="store_true", help="Stampa il payload JSON a terminale senza inviare la richiesta API")

    args = parser.parse_args()

    # Protected dashboard check
    if args.dashboard_id and args.dashboard_id in PROTECTED_DASHBOARDS and not args.force_protected_dashboard:
        print(f"[SECURITY ERROR] Dashboard ID {args.dashboard_id} is protected. Charts cannot be attached to it.")
        print("Specifica un altro ID dashboard o rimuovi il parametro --dashboard-id.")
        sys.exit(2)

    # Scelta form data
    if args.config_file:
        with open(args.config_file, "r", encoding="utf-8") as f:
            form_data = json.load(f)
    elif args.preset == "sales":
        form_data = DEFAULT_SALES_CONFIG
    else:
        form_data = DEFAULT_HEALTHCARE_CONFIG

    # Costruzione payload
    payload = build_chart_payload(
        slice_name=args.chart_name,
        datasource_id=args.dataset_id,
        datasource_type=args.dataset_type,
        form_data=form_data,
        description=args.description,
        dashboard_id=args.dashboard_id,
    )

    if args.dry_run:
        print("[DRY RUN] Payload ChartPostSchema (POST /api/v1/chart/):")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        sys.exit(0)

    # Password da input se non passata
    pwd = args.password
    if not args.token and not pwd:
        pwd = os.environ.get("SUPERSET_PASSWORD", "admin")

    print(f"[INFO] Invio richiesta di creazione chart a {args.url} (Dataset: {args.dataset_id}, Nome: '{args.chart_name}')...")
    result = create_chart_api(
        base_url=args.url,
        payload=payload,
        token=args.token,
        username=args.username,
        password=pwd,
    )

    if result["success"]:
        print("\n========================================================")
        print(f" [SUCCESS] Chart creato con successo! ID: {result['chart_id']}")
        print(f" [EXPLORE] Visualizza su Superset Explore:")
        print(f"           {result['explore_url']}")
        print("========================================================\n")
    else:
        print(f"\n[ERRORE] Creazione fallita (HTTP {result.get('status_code')}):")
        print(result.get("error"))
        sys.exit(1)


if __name__ == "__main__":
    main()
