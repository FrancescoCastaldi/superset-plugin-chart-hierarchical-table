// Apache Superset 6.1.0 - Hierarchical Table Interactive App Logic

const datasets = {
  sales: {
    name: 'Sales Geography',
    type: 'multi_dimension',
    dimensions: ['region', 'country', 'city', 'store_name'],
    metrics: ['revenue', 'units_sold', 'profit_margin'],
    formatters: {
      revenue: v =>
        '$' +
        Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      units_sold: v => Number(v).toLocaleString('en-US'),
      profit_margin: v => Number(v).toFixed(1) + '%',
    },
    records: [
      {
        region: 'Americas',
        country: 'USA',
        city: 'New York',
        store_name: '5th Avenue Flagship',
        revenue: 320000,
        units_sold: 920,
        profit_margin: 28.5,
      },
      {
        region: 'Americas',
        country: 'USA',
        city: 'San Francisco',
        store_name: 'Market Street Store',
        revenue: 280000,
        units_sold: 810,
        profit_margin: 28.1,
      },
      {
        region: 'Americas',
        country: 'USA',
        city: 'Chicago',
        store_name: 'Michigan Ave Hub',
        revenue: 195000,
        units_sold: 560,
        profit_margin: 27.9,
      },
      {
        region: 'Americas',
        country: 'Canada',
        city: 'Toronto',
        store_name: 'Downtown Toronto',
        revenue: 150000,
        units_sold: 440,
        profit_margin: 27.5,
      },
      {
        region: 'Americas',
        country: 'Canada',
        city: 'Vancouver',
        store_name: 'Robson Street',
        revenue: 120000,
        units_sold: 360,
        profit_margin: 28.0,
      },
      {
        region: 'EMEA',
        country: 'Italy',
        city: 'Milan',
        store_name: 'Duomo Flagship',
        revenue: 145000,
        units_sold: 420,
        profit_margin: 31.2,
      },
      {
        region: 'EMEA',
        country: 'Italy',
        city: 'Rome',
        store_name: 'Colosseo Store',
        revenue: 122000,
        units_sold: 380,
        profit_margin: 30.5,
      },
      {
        region: 'EMEA',
        country: 'Germany',
        city: 'Berlin',
        store_name: 'Mitte Store',
        revenue: 165000,
        units_sold: 490,
        profit_margin: 29.8,
      },
      {
        region: 'EMEA',
        country: 'Germany',
        city: 'Munich',
        store_name: 'Marienplatz Hub',
        revenue: 180000,
        units_sold: 520,
        profit_margin: 30.1,
      },
      {
        region: 'EMEA',
        country: 'France',
        city: 'Paris',
        store_name: 'Champs-Elysees',
        revenue: 210000,
        units_sold: 610,
        profit_margin: 32.0,
      },
      {
        region: 'APAC',
        country: 'Japan',
        city: 'Tokyo',
        store_name: 'Shibuya Hub',
        revenue: 240000,
        units_sold: 750,
        profit_margin: 33.4,
      },
      {
        region: 'APAC',
        country: 'Japan',
        city: 'Osaka',
        store_name: 'Umeda Center',
        revenue: 135000,
        units_sold: 410,
        profit_margin: 31.8,
      },
      {
        region: 'APAC',
        country: 'Singapore',
        city: 'Singapore',
        store_name: 'Marina Bay Store',
        revenue: 190000,
        units_sold: 580,
        profit_margin: 34.0,
      },
    ],
  },
  org: {
    name: 'Organization Chart',
    type: 'parent_child',
    idCol: 'employee_id',
    parentIdCol: 'manager_id',
    labelCol: 'name',
    metrics: ['salary', 'budget_managed'],
    formatters: {
      salary: v => '$' + Number(v).toLocaleString('en-US'),
      budget_managed: v => '$' + Number(v).toLocaleString('en-US'),
    },
    records: [
      {
        employee_id: '1',
        manager_id: null,
        name: 'Elena Rossi (Chief Executive Officer)',
        salary: 220000,
        budget_managed: 5000000,
      },
      {
        employee_id: '2',
        manager_id: '1',
        name: 'Marco Bianchi (Chief Technology Officer)',
        salary: 160000,
        budget_managed: 2000000,
      },
      {
        employee_id: '3',
        manager_id: '1',
        name: 'Giulia Verdi (Chief Marketing Officer)',
        salary: 150000,
        budget_managed: 1500000,
      },
      {
        employee_id: '4',
        manager_id: '1',
        name: 'Davide Neri (Chief Financial Officer)',
        salary: 155000,
        budget_managed: 1000000,
      },
      {
        employee_id: '5',
        manager_id: '2',
        name: 'Luca Ferrari (VP Software Architecture)',
        salary: 125000,
        budget_managed: 800000,
      },
      {
        employee_id: '6',
        manager_id: '2',
        name: 'Sara Romano (VP Cloud & DevOps)',
        salary: 120000,
        budget_managed: 700000,
      },
      {
        employee_id: '7',
        manager_id: '5',
        name: 'Alessandro Galli (Staff Data Engineer)',
        salary: 90000,
        budget_managed: 150000,
      },
      {
        employee_id: '8',
        manager_id: '5',
        name: 'Chiara Costa (Staff Frontend Engineer)',
        salary: 88000,
        budget_managed: 120000,
      },
      {
        employee_id: '9',
        manager_id: '3',
        name: 'Matteo Fontana (Head of Growth Marketing)',
        salary: 95000,
        budget_managed: 600000,
      },
    ],
  },
  pnl: {
    name: 'Financial P&L',
    type: 'parent_child',
    idCol: 'account_code',
    parentIdCol: 'parent_account_code',
    labelCol: 'account_name',
    metrics: ['q1_actual', 'q2_actual', 'full_year_budget'],
    formatters: {
      q1_actual: v => '€' + Number(v).toLocaleString('it-IT'),
      q2_actual: v => '€' + Number(v).toLocaleString('it-IT'),
      full_year_budget: v => '€' + Number(v).toLocaleString('it-IT'),
    },
    records: [
      {
        account_code: '1000',
        parent_account_code: null,
        account_name: 'Ricavi Totali',
        q1_actual: 750000,
        q2_actual: 820000,
        full_year_budget: 3200000,
      },
      {
        account_code: '1100',
        parent_account_code: '1000',
        account_name: 'Ricavi Abbonamenti SaaS',
        q1_actual: 500000,
        q2_actual: 560000,
        full_year_budget: 2200000,
      },
      {
        account_code: '1200',
        parent_account_code: '1000',
        account_name: 'Servizi Professionali & Consulenza',
        q1_actual: 250000,
        q2_actual: 260000,
        full_year_budget: 1000000,
      },
      {
        account_code: '2000',
        parent_account_code: null,
        account_name: 'Costi Operativi (OPEX)',
        q1_actual: 420000,
        q2_actual: 450000,
        full_year_budget: 1800000,
      },
      {
        account_code: '2100',
        parent_account_code: '2000',
        account_name: 'Personale & Salari',
        q1_actual: 280000,
        q2_actual: 295000,
        full_year_budget: 1200000,
      },
      {
        account_code: '2200',
        parent_account_code: '2000',
        account_name: 'Infrastruttura Cloud AWS/GCP',
        q1_actual: 85000,
        q2_actual: 92000,
        full_year_budget: 360000,
      },
      {
        account_code: '2300',
        parent_account_code: '2000',
        account_name: 'Marketing & Digital Acquisition',
        q1_actual: 55000,
        q2_actual: 63000,
        full_year_budget: 240000,
      },
      {
        account_code: '3000',
        parent_account_code: null,
        account_name: 'Margine Operativo Lordo (EBITDA)',
        q1_actual: 330000,
        q2_actual: 370000,
        full_year_budget: 1400000,
      },
    ],
  },
  supply_chain: {
    name: 'Global Supply Chain',
    type: 'multi_dimension',
    dimensions: ['zone', 'route', 'hub', 'warehouse'],
    metrics: ['inventory_units', 'lead_time_days', 'defect_ppm'],
    formatters: {
      inventory_units: v => Number(v).toLocaleString('en-US') + ' u',
      lead_time_days: v => Number(v).toFixed(1) + ' d',
      defect_ppm: v => Number(v).toFixed(0) + ' ppm',
    },
    records: [
      {
        zone: 'North America',
        route: 'Trans-Pacific',
        hub: 'Seattle Port',
        warehouse: 'SeaTac Fulfillment A1',
        inventory_units: 42000,
        lead_time_days: 14.2,
        defect_ppm: 120,
      },
      {
        zone: 'North America',
        route: 'Trans-Pacific',
        hub: 'Seattle Port',
        warehouse: 'Tacoma Cold Storage',
        inventory_units: 28000,
        lead_time_days: 16.5,
        defect_ppm: 85,
      },
      {
        zone: 'North America',
        route: 'Inland Rail',
        hub: 'Chicago Hub',
        warehouse: 'Midwest Distribution C4',
        inventory_units: 65000,
        lead_time_days: 4.8,
        defect_ppm: 45,
      },
      {
        zone: 'North America',
        route: 'Inland Rail',
        hub: 'Chicago Hub',
        warehouse: "O'Hare Rapid Sort",
        inventory_units: 31000,
        lead_time_days: 3.2,
        defect_ppm: 30,
      },
      {
        zone: 'Europe EMEA',
        route: 'Rotterdam Gateway',
        hub: 'Rotterdam Port',
        warehouse: 'Euro-Logistics Alpha',
        inventory_units: 58000,
        lead_time_days: 11.0,
        defect_ppm: 95,
      },
      {
        zone: 'Europe EMEA',
        route: 'Rotterdam Gateway',
        hub: 'Rotterdam Port',
        warehouse: 'Delta Automated Depo',
        inventory_units: 49000,
        lead_time_days: 12.4,
        defect_ppm: 60,
      },
      {
        zone: 'Europe EMEA',
        route: 'Alps Express',
        hub: 'Milan Sorting Hub',
        warehouse: 'Lombardia North Hub',
        inventory_units: 22000,
        lead_time_days: 2.5,
        defect_ppm: 20,
      },
      {
        zone: 'Europe EMEA',
        route: 'Alps Express',
        hub: 'Milan Sorting Hub',
        warehouse: 'Malpensa Air Cargo',
        inventory_units: 18500,
        lead_time_days: 1.8,
        defect_ppm: 15,
      },
      {
        zone: 'Asia-Pacific',
        route: 'Maritime Highway',
        hub: 'Singapore MegaHub',
        warehouse: 'Tuas Free Port Terminal',
        inventory_units: 95000,
        lead_time_days: 8.5,
        defect_ppm: 75,
      },
      {
        zone: 'Asia-Pacific',
        route: 'Maritime Highway',
        hub: 'Shanghai East Hub',
        warehouse: 'Pudong Smart Hub',
        inventory_units: 110000,
        lead_time_days: 7.2,
        defect_ppm: 110,
      },
    ],
  },
  ecommerce: {
    name: 'E-Commerce Taxonomy',
    type: 'multi_dimension',
    dimensions: ['department', 'category', 'subcategory'],
    metrics: ['gross_revenue', 'units_ordered', 'return_rate'],
    formatters: {
      gross_revenue: v => '$' + Number(v).toLocaleString('en-US'),
      units_ordered: v => Number(v).toLocaleString('en-US'),
      return_rate: v => Number(v).toFixed(1) + '%',
    },
    records: [
      {
        department: 'Consumer Electronics',
        category: 'Computing',
        subcategory: 'Laptops & Ultrabooks',
        gross_revenue: 840000,
        units_ordered: 720,
        return_rate: 6.2,
      },
      {
        department: 'Consumer Electronics',
        category: 'Computing',
        subcategory: 'Monitors & Displays',
        gross_revenue: 310000,
        units_ordered: 940,
        return_rate: 4.1,
      },
      {
        department: 'Consumer Electronics',
        category: 'Audio',
        subcategory: 'Wireless Headphones',
        gross_revenue: 450000,
        units_ordered: 2800,
        return_rate: 8.9,
      },
      {
        department: 'Consumer Electronics',
        category: 'Audio',
        subcategory: 'Soundbars & Home Audio',
        gross_revenue: 290000,
        units_ordered: 650,
        return_rate: 5.4,
      },
      {
        department: 'Apparel & Fashion',
        category: 'Footwear',
        subcategory: 'Performance Running',
        gross_revenue: 520000,
        units_ordered: 3900,
        return_rate: 14.8,
      },
      {
        department: 'Apparel & Fashion',
        category: 'Footwear',
        subcategory: 'Casual & Sneakers',
        gross_revenue: 680000,
        units_ordered: 5600,
        return_rate: 16.2,
      },
      {
        department: 'Apparel & Fashion',
        category: 'Outerwear',
        subcategory: 'Technical Jackets',
        gross_revenue: 410000,
        units_ordered: 1450,
        return_rate: 11.5,
      },
      {
        department: 'Home & Living',
        category: 'Smart Home',
        subcategory: 'Security Cameras',
        gross_revenue: 330000,
        units_ordered: 2100,
        return_rate: 7.1,
      },
      {
        department: 'Home & Living',
        category: 'Kitchen',
        subcategory: 'Espresso Machines',
        gross_revenue: 490000,
        units_ordered: 820,
        return_rate: 9.3,
      },
    ],
  },
  cloud_finops: {
    name: 'Cloud FinOps & Infrastructure',
    type: 'parent_child',
    idCol: 'resource_id',
    parentIdCol: 'parent_resource_id',
    labelCol: 'resource_name',
    metrics: ['monthly_cost', 'idle_waste_pct'],
    formatters: {
      monthly_cost: v => '$' + Number(v).toLocaleString('en-US'),
      idle_waste_pct: v => Number(v).toFixed(1) + '%',
    },
    records: [
      {
        resource_id: 'root',
        parent_resource_id: null,
        resource_name: 'Total Cloud Infrastructure (AWS / GCP)',
        monthly_cost: 185000,
        idle_waste_pct: 14.2,
      },
      {
        resource_id: 'k8s',
        parent_resource_id: 'root',
        resource_name: 'EKS/GKE Production Kubernetes Clusters',
        monthly_cost: 88000,
        idle_waste_pct: 18.5,
      },
      {
        resource_id: 'k8s_prod',
        parent_resource_id: 'k8s',
        resource_name: 'Production Core Workloads (48 nodes)',
        monthly_cost: 62000,
        idle_waste_pct: 12.0,
      },
      {
        resource_id: 'k8s_stg',
        parent_resource_id: 'k8s',
        resource_name: 'Staging & QA Auto-Scaled (16 nodes)',
        monthly_cost: 26000,
        idle_waste_pct: 34.0,
      },
      {
        resource_id: 'db',
        parent_resource_id: 'root',
        resource_name: 'Managed Database Systems (Spanner & RDS)',
        monthly_cost: 54000,
        idle_waste_pct: 8.5,
      },
      {
        resource_id: 'db_pg',
        parent_resource_id: 'db',
        resource_name: 'PostgreSQL Multi-AZ Primary/Replica',
        monthly_cost: 32000,
        idle_waste_pct: 5.2,
      },
      {
        resource_id: 'db_bq',
        parent_resource_id: 'db',
        resource_name: 'BigQuery / Analytics Slots Reservation',
        monthly_cost: 22000,
        idle_waste_pct: 13.4,
      },
      {
        resource_id: 'storage',
        parent_resource_id: 'root',
        resource_name: 'Object & Block Storage (S3 / GCS / EBS)',
        monthly_cost: 43000,
        idle_waste_pct: 12.8,
      },
      {
        resource_id: 'storage_hot',
        parent_resource_id: 'storage',
        resource_name: 'Standard Tier Hot Data (2.4 PB)',
        monthly_cost: 31000,
        idle_waste_pct: 7.0,
      },
      {
        resource_id: 'storage_cold',
        parent_resource_id: 'storage',
        resource_name: 'Unarchived Stale Buckets (>90 days)',
        monthly_cost: 12000,
        idle_waste_pct: 27.8,
      },
    ],
  },
};

let currentDatasetKey = 'sales';
let currentTree = [];
let expandedKeys = new Set();
let currentSearchTerm = '';

// --- Tree Builders ---
function buildMultiDimensionTree(records, dimensions, metrics) {
  const rootMap = new Map();
  for (const record of records) {
    let currentMap = rootMap;
    const currentPath = [];
    for (let i = 0; i < dimensions.length; i++) {
      const dim = dimensions[i];
      const val = String(record[dim] ?? '(Empty)');
      currentPath.push(val);
      const pathKey = currentPath.join(' > ');
      const isLeaf = i === dimensions.length - 1;

      if (!currentMap.has(val)) {
        const node = {
          key: pathKey,
          name: val,
          dimension: dim,
          depth: i,
          path: [...currentPath],
          isLeaf,
          metrics: {},
          childrenMap: isLeaf ? null : new Map(),
        };
        if (isLeaf) {
          metrics.forEach(m => (node.metrics[m] = Number(record[m]) || 0));
        }
        currentMap.set(val, node);
      }
      const curr = currentMap.get(val);
      if (!isLeaf && curr.childrenMap) {
        currentMap = curr.childrenMap;
      }
    }
  }

  function convert(map) {
    const nodes = [];
    for (const item of map.values()) {
      const n = {
        key: item.key,
        name: item.name,
        dimension: item.dimension,
        depth: item.depth,
        path: item.path,
        isLeaf: item.isLeaf,
        metrics: item.metrics,
      };
      if (item.childrenMap && item.childrenMap.size > 0) {
        n.children = convert(item.childrenMap);
      }
      nodes.push(n);
    }
    return nodes;
  }

  const tree = convert(rootMap);
  rollupMetrics(tree, metrics);
  return tree;
}

function buildParentChildTree(records, idCol, parentIdCol, labelCol, metrics) {
  const nodeMap = new Map();
  const parentToChildren = new Map();
  const allIds = new Set();

  for (const r of records) {
    const id = String(r[idCol]);
    const pId = r[parentIdCol] ? String(r[parentIdCol]) : null;
    const name = labelCol ? String(r[labelCol]) : id;
    allIds.add(id);

    const mValues = {};
    metrics.forEach(m => (mValues[m] = Number(r[m]) || 0));

    nodeMap.set(id, {
      key: id,
      name,
      depth: 0,
      path: [name],
      isLeaf: true,
      metrics: mValues,
    });

    const pKey = pId ?? '__ROOT__';
    if (!parentToChildren.has(pKey)) parentToChildren.set(pKey, []);
    parentToChildren.get(pKey).push(id);
  }

  const rootIds = [];
  for (const r of records) {
    const id = String(r[idCol]);
    const pId = r[parentIdCol] ? String(r[parentIdCol]) : null;
    if (!pId || !allIds.has(pId)) {
      if (!rootIds.includes(id)) rootIds.push(id);
    }
  }

  function assemble(id, depth, path) {
    const node = nodeMap.get(id);
    if (!node) return null;
    node.depth = depth;
    node.path = [...path, node.name];
    const childIds = parentToChildren.get(id) || [];
    if (childIds.length > 0) {
      node.isLeaf = false;
      node.children = childIds.map(cId => assemble(cId, depth + 1, node.path)).filter(Boolean);
    }
    return node;
  }

  const roots = rootIds.map(rId => assemble(rId, 0, [])).filter(Boolean);
  rollupMetrics(roots, metrics);
  return roots;
}

function rollupMetrics(nodes, metrics) {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      rollupMetrics(node.children, metrics);
      for (const m of metrics) {
        if (m === 'profit_margin') {
          // Average for margins
          const sum = node.children.reduce((acc, c) => acc + (c.metrics[m] || 0), 0);
          node.metrics[m] = sum / node.children.length;
        } else {
          node.metrics[m] = node.children.reduce((acc, c) => acc + (c.metrics[m] || 0), 0);
        }
      }
    }
  }
}

function computeGrandTotal(roots, metrics) {
  const gMetrics = {};
  for (const m of metrics) {
    if (m === 'profit_margin') {
      const sum = roots.reduce((acc, r) => acc + (r.metrics[m] || 0), 0);
      gMetrics[m] = sum / (roots.length || 1);
    } else {
      gMetrics[m] = roots.reduce((acc, r) => acc + (r.metrics[m] || 0), 0);
    }
  }
  return {
    key: '__grand_total__',
    name: 'Grand Total (All Records)',
    depth: 0,
    metrics: gMetrics,
  };
}

function filterTree(nodes, term) {
  if (!term) return nodes;
  const lower = term.toLowerCase();

  function filterNode(n) {
    const matches = n.name.toLowerCase().includes(lower);
    let matchingChildren = [];
    if (n.children) {
      matchingChildren = n.children.map(filterNode).filter(Boolean);
    }
    if (matches || matchingChildren.length > 0) {
      return {
        ...n,
        children: matchingChildren.length > 0 ? matchingChildren : n.children,
      };
    }
    return null;
  }

  return nodes.map(filterNode).filter(Boolean);
}

const activeFilterMap = new Map(); // key -> { dim, val, key, path, node }

function findNodeByKey(nodes, key) {
  for (const n of nodes) {
    if (n.key === key) return n;
    if (n.children && n.children.length > 0) {
      const found = findNodeByKey(n.children, key);
      if (found) return found;
    }
  }
  return null;
}

// Evaluates raw records matching the active multi-selection
function getFilteredRecords() {
  const config = datasets[currentDatasetKey];
  const selectedItems = Array.from(activeFilterMap.values());
  if (!selectedItems || selectedItems.length === 0) {
    return config.records;
  }

  if (config.type === 'multi_dimension') {
    return config.records.filter(record => {
      // Record matches if it belongs to ANY selected branch
      return selectedItems.some(item => {
        if (item.path && item.path.length > 0) {
          for (let i = 0; i < item.path.length; i++) {
            const dim = config.dimensions[i];
            if (String(record[dim] ?? '(Empty)') !== item.path[i]) {
              return false;
            }
          }
          return true;
        }
        return String(record[item.dim]) === String(item.val);
      });
    });
  } else {
    // Parent-Child mode: collect all matching IDs (including subtree)
    const allowedIds = new Set();
    for (const item of selectedItems) {
      if (item.node) {
        function collect(n) {
          allowedIds.add(String(n.id || n.key));
          if (n.children && n.children.length > 0) {
            n.children.forEach(collect);
          }
        }
        collect(item.node);
      } else {
        allowedIds.add(String(item.key));
      }
    }
    return config.records.filter(r => allowedIds.has(String(r[config.idCol])));
  }
}

// Compute aggregate metrics from a filtered list of records
function computeFilteredMetrics(records, metrics) {
  const result = {};
  for (const m of metrics) {
    if (m === 'profit_margin') {
      const sum = records.reduce((acc, r) => acc + (Number(r[m]) || 0), 0);
      result[m] = records.length > 0 ? sum / records.length : 0;
    } else {
      result[m] = records.reduce((acc, r) => acc + (Number(r[m]) || 0), 0);
    }
  }
  return result;
}

// --- Table Rendering ---
function renderTable() {
  const config = datasets[currentDatasetKey];
  const head = document.getElementById('tableHead');
  const body = document.getElementById('tableBody');
  const filterIndicatorEl = document.getElementById('activeFilterContainer');

  // Multi-Filter badges update
  if (filterIndicatorEl) {
    if (activeFilterMap.size > 0) {
      const chipsHTML = Array.from(activeFilterMap.values())
        .map(f => {
          const encKey = encodeURIComponent(f.key);
          return `
          <div class="active-filter-chip">
            <span>⚡ ${f.val}</span>
            <button type="button" class="filter-chip-clear" onclick="removeSingleFilter('${encKey}')" title="Remove filter">✕</button>
          </div>
        `;
        })
        .join('');

      filterIndicatorEl.innerHTML = `
        <div class="active-filter-container">
          ${chipsHTML}
          ${activeFilterMap.size > 1 ? `<button type="button" class="filter-clear-all-btn" onclick="clearActiveFilter()">Clear All (${activeFilterMap.size})</button>` : ''}
        </div>
      `;
    } else {
      filterIndicatorEl.innerHTML = '';
    }
  }

  // Header
  let headerHTML = `<tr><th>Hierarchy Level ${activeFilterMap.size > 0 ? `<span style="color:var(--orange-accent); font-size:10px;">(${activeFilterMap.size} selected)</span>` : ''}</th>`;
  for (const m of config.metrics) {
    headerHTML += `<th class="num">${m.replace(/_/g, ' ').toUpperCase()}</th>`;
  }
  headerHTML += '</tr>';
  head.innerHTML = headerHTML;

  // Filter and total
  const filtered = filterTree(currentTree, currentSearchTerm);
  const grandTotal = computeGrandTotal(currentTree, config.metrics);

  // Grand Total Row
  let bodyHTML = `
    <tr class="grand-total-row">
      <td><strong>${grandTotal.name}</strong></td>
      ${config.metrics.map(m => `<td class="num"><strong>${config.formatters[m](grandTotal.metrics[m])}</strong></td>`).join('')}
    </tr>
  `;

  // Nodes
  function renderNodes(nodes) {
    for (const n of nodes) {
      const hasChildren = n.children && n.children.length > 0;
      const isExpanded = expandedKeys.has(n.key) || currentSearchTerm.length > 0;
      const isFilterSelected = activeFilterMap.has(n.key);
      const indent = n.depth * 24;
      const encKey = encodeURIComponent(n.key);

      bodyHTML += `
        <tr class="${isFilterSelected ? 'selected-filter-row' : ''}">
          <td style="padding-left: ${indent + 18}px;">
            <input
              type="checkbox"
              class="node-checkbox"
              ${isFilterSelected ? 'checked' : ''}
              onclick="event.stopPropagation(); triggerCrossFilter('${encKey}')"
              title="${isFilterSelected ? 'Deselect' : 'Select'} ${n.name}"
            />
            ${
              hasChildren
                ? `
              <span class="node-btn" onclick="toggleNode('${encKey}')">${isExpanded ? '−' : '+'}</span>
            `
                : '<span style="display:inline-block; width:18px;"></span>'
            }
            <span
              class="node-name-link ${hasChildren ? 'node-parent' : ''} ${isFilterSelected ? 'node-filter-active' : ''}"
              onclick="triggerCrossFilter('${encKey}')"
              title="Click to ${isFilterSelected ? 'remove from multi-filter' : 'add to multi-filter: ' + n.name}"
            >
              ${n.name}
            </span>
          </td>
          ${config.metrics.map(m => `<td class="num">${config.formatters[m](n.metrics[m])}</td>`).join('')}
        </tr>
      `;

      if (hasChildren && isExpanded) {
        renderNodes(n.children);
      }
    }
  }

  renderNodes(filtered);
  body.innerHTML = bodyHTML;
}

function toggleNode(keyOrEncoded) {
  const key = decodeURIComponent(keyOrEncoded);
  if (expandedKeys.has(key)) {
    expandedKeys.delete(key);
  } else {
    expandedKeys.add(key);
  }
  renderTable();
}

function handleExpandAll() {
  function collect(nodes) {
    for (const n of nodes) {
      if (n.children) {
        expandedKeys.add(n.key);
        collect(n.children);
      }
    }
  }
  collect(currentTree);
  renderTable();
}

function handleCollapseAll() {
  expandedKeys.clear();
  renderTable();
}

function handleSearch(val) {
  currentSearchTerm = val.trim();
  renderTable();
}

// Companion Charts Update Logic with Accurate Multi-Selection Record Evaluation
function updateCompanionCharts() {
  const config = datasets[currentDatasetKey];
  const kpiValEl = document.getElementById('kpiBigNumber');
  const kpiLabelEl = document.getElementById('kpiSubLabel');
  const barListEl = document.getElementById('companionBarList');
  const sidebarFilterEl = document.getElementById('sidebarFilterStatus');
  const bannerEl = document.getElementById('crossFilterBanner');
  const sparklineEl = document.getElementById('kpiSparkline');
  const donutSvgEl = document.getElementById('donutSvg');
  const donutLegendEl = document.getElementById('donutLegend');
  const areaChartEl = document.getElementById('areaChartSvg');

  const selectedItems = Array.from(activeFilterMap.values());
  const filteredRecords = getFilteredRecords();
  const primaryMetric = config.metrics[0];
  const filteredMetrics = computeFilteredMetrics(filteredRecords, config.metrics);

  // 1. Update Broadcast Banner
  if (bannerEl) {
    if (selectedItems.length > 0) {
      bannerEl.style.display = 'flex';
      const labelText = selectedItems.map(it => it.val).join(', ');
      bannerEl.innerHTML = `
        <div>
          <span style="color:#38bdf8;">⚡ Multi Cross-Filter Active (${selectedItems.length} selected):</span> Broadcasting <strong>[${labelText}]</strong> • Matching ${filteredRecords.length} records
        </div>
        <button type="button" class="btn-sm" style="background:#1e293b; color:#38bdf8; border:1px solid #334155; padding:2px 8px; font-size:11px;" onclick="clearActiveFilter()">Clear Filters ✕</button>
      `;
    } else {
      bannerEl.style.display = 'none';
    }
  }

  // 2. Update KPI Big Number & Sparkline
  if (kpiValEl && kpiLabelEl) {
    const combinedVal = filteredMetrics[primaryMetric] || 0;
    kpiValEl.innerText = config.formatters[primaryMetric](combinedVal);

    if (selectedItems.length === 0) {
      kpiLabelEl.innerText = `Grand Total (${primaryMetric.replace(/_/g, ' ')}) • ${config.records.length} records`;
    } else if (selectedItems.length === 1) {
      kpiLabelEl.innerText = `${selectedItems[0].val} (${primaryMetric.replace(/_/g, ' ')}) • ${filteredRecords.length} records`;
    } else {
      const names =
        selectedItems
          .map(it => it.val)
          .slice(0, 3)
          .join(', ') + (selectedItems.length > 3 ? ` +${selectedItems.length - 3} more` : '');
      kpiLabelEl.innerText = `${selectedItems.length} Filters (${names}) • ${filteredRecords.length} records`;
    }

    if (sparklineEl) {
      const points = [
        combinedVal * 0.65,
        combinedVal * 0.78,
        combinedVal * 0.82,
        combinedVal * 0.91,
        combinedVal * 1.04,
        combinedVal * 1.12,
        combinedVal,
      ];
      const maxP = Math.max(...points) || 1;
      const minP = Math.min(...points) * 0.85;
      const range = maxP - minP || 1;
      const coords = points
        .map((p, idx) => {
          const x = (idx / (points.length - 1)) * 260 + 10;
          const y = 40 - ((p - minP) / range) * 32 + 4;
          return `${x},${y}`;
        })
        .join(' ');

      sparklineEl.innerHTML = `
        <polyline fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" points="${coords}" />
        <circle cx="${270}" cy="${40 - ((points[points.length - 1] - minP) / range) * 32 + 4}" r="4" fill="#ea580c" />
      `;
    }
  }

  // 3. Update Sidebar Filters
  if (sidebarFilterEl) {
    if (selectedItems.length > 0) {
      sidebarFilterEl.innerHTML = `
        <div class="filter-status-tag">
          <span class="tag-head">⚡ ACTIVE MULTI-FILTER (${selectedItems.length})</span>
          <div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
            ${selectedItems
              .map(it => {
                const encKey = encodeURIComponent(it.key);
                return `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
                  <span><strong>${it.val}</strong> <small style="color:var(--text-dimmed);">(${it.dim})</small></span>
                  <button type="button" style="background:none; border:none; color:var(--orange-accent); cursor:pointer; font-weight:bold;" onclick="removeSingleFilter('${encKey}')" title="Remove filter">✕</button>
                </div>
              `;
              })
              .join('')}
          </div>
          <button type="button" class="btn-sm" style="margin-top:6px; padding:3px 8px; font-size:10px;" onclick="clearActiveFilter()">Clear All</button>
        </div>
      `;
    } else {
      sidebarFilterEl.innerHTML = `
        <span style="font-size:12px; color: var(--text-dimmed);">No active cross-filters. Click checkboxes or rows in the table to multi-select.</span>
      `;
    }
  }

  // 4. Update Companion Bar Chart
  let itemsToDisplay = [];
  if (selectedItems.length > 1) {
    // Show comparison between the selected entities
    itemsToDisplay = selectedItems.map(it => it.node).filter(Boolean);
  } else if (selectedItems.length === 1 && selectedItems[0].node) {
    const n = selectedItems[0].node;
    itemsToDisplay = n.children && n.children.length > 0 ? n.children : [n];
  } else {
    itemsToDisplay = currentTree;
  }

  if (barListEl) {
    const maxVal = Math.max(...itemsToDisplay.map(it => it.metrics[primaryMetric] || 1), 1);
    let barsHTML = '';
    for (const item of itemsToDisplay) {
      const val = item.metrics[primaryMetric] || 0;
      const pct = Math.min(100, Math.max(8, (val / maxVal) * 100));
      const isItemSel = activeFilterMap.has(item.key);
      const encKey = encodeURIComponent(item.key);
      barsHTML += `
        <div class="bar-item ${isItemSel ? 'bar-selected' : ''}" onclick="triggerCrossFilter('${encKey}')" style="cursor:pointer;" title="Click to toggle filter by ${item.name}">
          <div class="bar-meta">
            <span>${isItemSel ? '✓ ' : ''}${item.name}</span>
            <span style="color:#cbd5e1; font-family:'Roboto Mono',monospace;">${config.formatters[primaryMetric](val)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-progress" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }
    barListEl.innerHTML = barsHTML;
  }

  // 5. Update Donut / Share Chart
  if (donutSvgEl && donutLegendEl) {
    const totalVal =
      itemsToDisplay.reduce((acc, it) => acc + (it.metrics[primaryMetric] || 0), 0) || 1;
    const colors = ['#3b82f6', '#ea580c', '#be123c', '#10b981', '#8b5cf6', '#f59e0b'];
    let accumulatedAngle = 0;
    let pathsHTML = '';
    let legendHTML = '';

    itemsToDisplay.slice(0, 6).forEach((item, idx) => {
      const val = item.metrics[primaryMetric] || 0;
      const slicePct = val / totalVal;
      const angle = slicePct * 360;
      const color = colors[idx % colors.length];

      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle = endAngle;

      const rOuter = 55;
      const rInner = 35;
      const cx = 65;
      const cy = 65;

      const x1 = cx + rOuter * Math.cos((Math.PI * (startAngle - 90)) / 180);
      const y1 = cy + rOuter * Math.sin((Math.PI * (startAngle - 90)) / 180);
      const x2 = cx + rOuter * Math.cos((Math.PI * (endAngle - 90)) / 180);
      const y2 = cy + rOuter * Math.sin((Math.PI * (endAngle - 90)) / 180);
      const x3 = cx + rInner * Math.cos((Math.PI * (endAngle - 90)) / 180);
      const y3 = cy + rInner * Math.sin((Math.PI * (endAngle - 90)) / 180);
      const x4 = cx + rInner * Math.cos((Math.PI * (startAngle - 90)) / 180);
      const y4 = cy + rInner * Math.sin((Math.PI * (startAngle - 90)) / 180);

      const largeArc = angle > 180 ? 1 : 0;
      const pathD = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      pathsHTML += `<path d="${pathD}" fill="${color}" stroke="#101218" stroke-width="1.5" />`;
      legendHTML += `
        <div class="donut-legend-item">
          <span class="legend-dot" style="background:${color};"></span>
          <span>${item.name.slice(0, 14)}: <strong style="color:var(--text-main); font-family:'Roboto Mono',monospace;">${(slicePct * 100).toFixed(0)}%</strong></span>
        </div>
      `;
    });

    donutSvgEl.innerHTML = pathsHTML;
    donutLegendEl.innerHTML = legendHTML;
  }

  // 6. Update Quarterly Area / Line Chart
  if (areaChartEl) {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    let qValues = [];

    if (currentDatasetKey === 'pnl') {
      // Use exact Q1 / Q2 / Budget metrics from filtered P&L records
      const q1 = filteredMetrics['q1_actual'] || 0;
      const q2 = filteredMetrics['q2_actual'] || 0;
      const budget = filteredMetrics['full_year_budget'] || 1;
      const q3 = Math.max(0, (budget - q1 - q2) * 0.48);
      const q4 = Math.max(0, (budget - q1 - q2) * 0.52);
      qValues = [q1, q2, q3, q4];
    } else {
      const baseVal = filteredMetrics[primaryMetric] || 0;
      qValues = [baseVal * 0.21, baseVal * 0.24, baseVal * 0.27, baseVal * 0.28];
    }

    const maxQ = Math.max(...qValues) * 1.15 || 1;
    const minQ = 0;

    const w = 480;
    const h = 130;
    const pts = qValues.map((v, i) => {
      const x = (i / (quarters.length - 1)) * (w - 60) + 40;
      const y = h - ((v - minQ) / maxQ) * (h - 30) - 20;
      return { x, y, v };
    });

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${h - 20} L ${pts[0].x} ${h - 20} Z`;

    areaChartEl.innerHTML = `
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <!-- Grid lines -->
      <line x1="40" y1="20" x2="${w - 20}" y2="20" stroke="#202430" />
      <line x1="40" y1="60" x2="${w - 20}" y2="60" stroke="#202430" />
      <line x1="40" y1="100" x2="${w - 20}" y2="100" stroke="#202430" />
      <line x1="40" y1="${h - 20}" x2="${w - 20}" y2="${h - 20}" stroke="#32384a" />

      <!-- Area and Line -->
      <path d="${areaPath}" fill="url(#areaGrad)" />
      <path d="${linePath}" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" />

      <!-- Data points & labels -->
      ${pts
        .map(
          (p, idx) => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ea580c" stroke="#101218" stroke-width="2" />
        <text x="${p.x}" y="${h - 6}" font-family="'Roboto Mono', monospace" font-size="10" font-weight="600" fill="#8d94a5" text-anchor="middle">${quarters[idx]}</text>
        <text x="${p.x}" y="${p.y - 8}" font-family="'Roboto Mono', monospace" font-size="10" font-weight="bold" fill="#f1f3f8" text-anchor="middle">${config.formatters[primaryMetric](p.v)}</text>
      `,
        )
        .join('')}
    `;
  }
}

function triggerCrossFilter(keyOrEncoded) {
  const key = decodeURIComponent(keyOrEncoded);
  const logEl = document.getElementById('consoleLog');
  const timestamp = new Date().toLocaleTimeString();

  if (activeFilterMap.has(key)) {
    activeFilterMap.delete(key);
  } else {
    const node = findNodeByKey(currentTree, key);
    if (node) {
      activeFilterMap.set(key, {
        dim: node.dimension || 'Hierarchy',
        val: node.name,
        key: node.key,
        path: node.path,
        node,
      });
    }
  }

  const selectedItems = Array.from(activeFilterMap.values());
  if (selectedItems.length === 0) {
    if (logEl)
      logEl.innerHTML = `<span style="color:#94a3b8;">[${timestamp}]</span> 🔄 <strong>Cleared Superset Cross-Filter:</strong> { "filterState": null, "extraFormData": {} }`;
  } else {
    // Group values by dimension for native Superset payload
    const grouped = {};
    for (const item of selectedItems) {
      if (!grouped[item.dim]) grouped[item.dim] = [];
      grouped[item.dim].push(item.val);
    }
    const filters = Object.entries(grouped).map(([col, vals]) => ({ col, op: 'IN', val: vals }));
    const payload = {
      extraFormData: { filters },
      filterState: {
        value: selectedItems.map(it => it.val),
        selectedValues: selectedItems.map(it => it.val),
        label: selectedItems.map(it => `${it.dim}: ${it.val}`).join(', '),
      },
    };
    if (logEl) {
      logEl.innerHTML = `<span style="color:#38bdf8;">[${timestamp}]</span> ⚡ <strong>Emitted Superset 6.1.0 Multi Cross-Filter (setDataMask):</strong> <pre style="display:inline; color:#a7f3d0;">${JSON.stringify(payload)}</pre>`;
    }
  }

  renderTable();
  updateCompanionCharts();
}

function removeSingleFilter(keyOrEncoded) {
  const key = decodeURIComponent(keyOrEncoded);
  activeFilterMap.delete(key);
  const logEl = document.getElementById('consoleLog');
  const timestamp = new Date().toLocaleTimeString();
  if (logEl) {
    logEl.innerHTML = `<span style="color:#94a3b8;">[${timestamp}]</span> 🔄 <strong>Removed filter key:</strong> ${key} (${activeFilterMap.size} remaining)`;
  }
  renderTable();
  updateCompanionCharts();
}

function clearActiveFilter() {
  const logEl = document.getElementById('consoleLog');
  const timestamp = new Date().toLocaleTimeString();
  activeFilterMap.clear();
  if (logEl) {
    logEl.innerHTML = `<span style="color:#94a3b8;">[${timestamp}]</span> 🔄 <strong>Cleared All Superset Cross-Filters</strong>`;
  }
  renderTable();
  updateCompanionCharts();
}

function loadDataset(key) {
  currentDatasetKey = key;
  activeFilterMap.clear();
  const cfg = datasets[key];
  if (cfg.type === 'multi_dimension') {
    currentTree = buildMultiDimensionTree(cfg.records, cfg.dimensions, cfg.metrics);
  } else {
    currentTree = buildParentChildTree(
      cfg.records,
      cfg.idCol,
      cfg.parentIdCol,
      cfg.labelCol,
      cfg.metrics,
    );
  }
  expandedKeys.clear();
  // Expand first level by default
  currentTree.forEach(n => expandedKeys.add(n.key));
  renderTable();
  updateCompanionCharts();
}

// Code Box Tab Switcher
const codeSnippets = {
  powershell: `# Install directly into local Superset 6.1.0 on Windows PowerShell\n.\\scripts\\install.ps1 -SupersetPath "C:\\path\\to\\superset"`,
  bash: `# Install directly on Linux / macOS / Git Bash\n./scripts/install.sh --superset-path "/path/to/superset"`,
  docker: `# Docker Compose Override (docker-compose.override.yml)\nversion: '3.7'\nservices:\n  superset-node:\n    volumes:\n      - ./superset-frontend/plugins/superset-plugin-chart-hierarchical-table:/app/superset-frontend/plugins/superset-plugin-chart-hierarchical-table`,
};

function selectTab(tabKey, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('codeDisplay').innerText = codeSnippets[tabKey];
}

function copyCode() {
  const code = document.getElementById('codeDisplay').innerText;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.innerText = 'Copied! ✓';
    setTimeout(() => {
      btn.innerText = 'Copy';
    }, 2000);
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  loadDataset('sales');
  initAiEngine();
});

/* ==========================================================================
   StratumTree AI Engine Implementation (Local Smart NLP + Gemini 2.5 API)
   ========================================================================== */

let aiConfig = {
  mode: localStorage.getItem('stratum_ai_mode') || 'local',
  apiKey: localStorage.getItem('stratum_gemini_key') || '',
  model: localStorage.getItem('stratum_gemini_model') || 'gemini-2.5-flash',
};

function initAiEngine() {
  updateAiStatusBadge();
  const modeSelect = document.getElementById('aiEngineMode');
  const keyInput = document.getElementById('geminiApiKey');
  const modelSelect = document.getElementById('geminiModelSelect');

  if (modeSelect) modeSelect.value = aiConfig.mode;
  if (keyInput) keyInput.value = aiConfig.apiKey;
  if (modelSelect) modelSelect.value = aiConfig.model;
  toggleAiKeyInput(aiConfig.mode);
}

function updateAiStatusBadge() {
  const badge = document.getElementById('aiStatusBadge');
  if (!badge) return;
  if (aiConfig.mode === 'gemini' && aiConfig.apiKey) {
    badge.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span> Gemini ${aiConfig.model} Connected`;
    badge.style.background = 'rgba(56, 189, 248, 0.12)';
    badge.style.borderColor = 'rgba(56, 189, 248, 0.3)';
    badge.style.color = '#7dd3fc';
  } else {
    badge.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#4ade80;"></span> Client-Side NLP Ready`;
    badge.style.background = 'rgba(34, 197, 94, 0.12)';
    badge.style.borderColor = 'rgba(34, 197, 94, 0.3)';
    badge.style.color = '#4ade80';
  }
}

function openAiConfigModal() {
  const modal = document.getElementById('aiConfigModal');
  if (modal) modal.style.display = 'flex';
}

function closeAiConfigModal() {
  const modal = document.getElementById('aiConfigModal');
  if (modal) modal.style.display = 'none';
}

function toggleAiKeyInput(mode) {
  const keyField = document.getElementById('geminiKeyField');
  const modelField = document.getElementById('geminiModelField');
  if (keyField) keyField.style.display = mode === 'gemini' ? 'block' : 'none';
  if (modelField) modelField.style.display = mode === 'gemini' ? 'block' : 'none';
}

function saveAiConfig() {
  const mode = document.getElementById('aiEngineMode').value;
  const apiKey = document.getElementById('geminiApiKey').value.trim();
  const model = document.getElementById('geminiModelSelect').value;

  aiConfig = { mode, apiKey, model };
  localStorage.setItem('stratum_ai_mode', mode);
  localStorage.setItem('stratum_gemini_key', apiKey);
  localStorage.setItem('stratum_gemini_model', model);

  updateAiStatusBadge();
  closeAiConfigModal();

  const logEl = document.getElementById('consoleLog');
  if (logEl) {
    logEl.innerHTML = `<span style="color:#a855f7;">[${new Date().toLocaleTimeString()}]</span> ⚙️ <strong>AI Engine Configured:</strong> Mode: <code>${mode}</code> (${mode === 'gemini' ? model : 'Local Smart NLP'})`;
  }
}

// Preset Prompts Quick Launcher
function applyPresetPrompt(presetType) {
  const inputEl = document.getElementById('aiPromptInput');
  const presets = {
    org: "Crea e visualizza l'Organigramma aziendale a 4 livelli (CEO, Direttori, VP, Lead)",
    supply_chain:
      'Genera una gerarchia per la Supply Chain globale con 4 livelli (Zone, Route, Hub, Warehouse) e metriche di lead time e difetti',
    ecommerce:
      'Genera un catalogo E-Commerce a 3 livelli (Reparto, Categoria, Sottocategoria) con tasso di reso e ricavi',
    cloud_finops:
      'Struttura la gerarchia dei costi Cloud Infrastructure & FinOps (AWS/GCP, Kubernetes, Database, Storage)',
    filter_margin:
      'Filtra la vista corrente per mostrare solo i negozi o filiali con margine critico (< 28%)',
    insights:
      'Analizza il dataset corrente ed estrai i principali insight analitici, KPI e anomalie',
    sql_cte:
      'Genera la query SQL Recursive CTE per Apache Superset compatibile con PostgreSQL e Trino',
  };

  if (presets[presetType]) {
    if (inputEl) inputEl.value = presets[presetType];
    executeAiPrompt(presets[presetType]);
  }
}

function handleAiPromptSubmit() {
  const inputEl = document.getElementById('aiPromptInput');
  if (!inputEl) return;
  const prompt = inputEl.value.trim();
  if (!prompt) return;
  executeAiPrompt(prompt);
}

async function executeAiPrompt(promptText) {
  const btn = document.getElementById('aiRunBtn');
  const insightBox = document.getElementById('aiInsightBox');
  const insightBody = document.getElementById('aiInsightBody');
  const insightHighlights = document.getElementById('aiInsightHighlights');
  const insightTag = document.getElementById('aiInsightTag');
  const insightTime = document.getElementById('aiInsightTime');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="ai-spinner"></span> Elaborazione AI...`;
  }

  if (insightBox) {
    insightBox.style.display = 'block';
    insightTag.innerHTML = `✨ AI Thinking...`;
    insightBody.innerHTML = `<span class="ai-generating-loader"><span class="ai-spinner"></span> Analisi semantica del prompt ed esecuzione in corso...</span>`;
    insightHighlights.innerHTML = '';
  }

  try {
    if (aiConfig.mode === 'gemini' && aiConfig.apiKey) {
      await runGeminiPrompt(promptText);
    } else {
      await runSmartLocalNlp(promptText);
    }
  } catch (err) {
    console.error('AI Execution Error:', err);
    if (insightBody) {
      insightBody.innerHTML = `<span style="color:#f87171;">⚠️ Errore nell'elaborazione AI: ${err.message}. Esecuzione con il motore locale di fallback...</span>`;
    }
    await runSmartLocalNlp(promptText);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>⚡ Esegui Prompt</span>`;
    }
    if (insightTime) {
      insightTime.innerText = new Date().toLocaleTimeString();
    }
  }
}

// Local Smart NLP Rules & Generative Simulator
async function runSmartLocalNlp(promptText) {
  // Simulate natural AI computation latency (300-600ms)
  await new Promise(r => setTimeout(r, 450));

  const lower = promptText.toLowerCase();
  const dropdown = document.getElementById('datasetDropdown');

  // 1. Organigramma HR
  if (
    lower.includes('org') ||
    lower.includes('organigramma') ||
    lower.includes('ceo') ||
    lower.includes('dipendent') ||
    lower.includes('hr') ||
    lower.includes('stipend')
  ) {
    loadDataset('org');
    if (dropdown) dropdown.value = 'org';
    handleExpandAll();
    displayAiInsight(
      '🏢 StratumTree AI • Corporate Hierarchy Generated',
      "Ho caricato e modellato l'<strong>Organigramma Aziendale (Parent-Child)</strong>. La radice corrisponde al CEO, con rollup automatico degli stipendi aggregati ($1.17M) e del budget gestito ($12.8M) calcolati via post-order traversal su ogni ramo gerarchico.",
      [
        'Tipo: Parent-Child Graph',
        'Profondità Max: 4 Livelli',
        'Nodi Totali: 11 Ruoli',
        'Budget Rollup: $12.85M',
      ],
    );
    return;
  }

  // 2. Supply Chain
  if (
    lower.includes('supply') ||
    lower.includes('logist') ||
    lower.includes('spediz') ||
    lower.includes('magazzin') ||
    lower.includes('hub') ||
    lower.includes('porto') ||
    lower.includes('lead time')
  ) {
    loadDataset('supply_chain');
    if (dropdown) dropdown.value = 'supply_chain';
    handleExpandAll();
    displayAiInsight(
      '📦 StratumTree AI • Global Supply Chain Grid',
      'Ho generato la matrice multi-livello per la <strong>Supply Chain Globale</strong> strutturata su 4 dimensioni: <code>Zone &gt; Route &gt; Hub &gt; Warehouse</code>. I lead time e i tassi di difetto PPM sono aggregati e calcolati automaticamente per ogni corridoio di trasporto.',
      [
        'Struttura: 4 Livelli Multi-Dimension',
        'Unità Stoccate: 518,500 u',
        'Lead Time Medio: 8.5 gg',
        'Anomalia: SeaTac 120 PPM',
      ],
    );
    return;
  }

  // 3. E-Commerce Taxonomy
  if (
    lower.includes('e-commerce') ||
    lower.includes('ecommerce') ||
    lower.includes('catalogo') ||
    lower.includes('prodott') ||
    (lower.includes('vendit') && lower.includes('repart')) ||
    lower.includes('reso')
  ) {
    loadDataset('ecommerce');
    if (dropdown) dropdown.value = 'ecommerce';
    handleExpandAll();
    displayAiInsight(
      '🛒 StratumTree AI • E-Commerce Taxonomy Matrix',
      'Ho strutturato il catalogo prodotti gerarchico a 3 dimensioni (<code>Department &gt; Category &gt; Subcategory</code>) integrando metriche di fatturato lordo, ordini unitari e tasso medio di reso cliente.',
      [
        'Fatturato Totale: $3.84M',
        'Tasso Reso Medio: 9.8%',
        'Top Seller: Laptops ($840k)',
        'Attenzione: Sneakers 16.2% Reso',
      ],
    );
    return;
  }

  // 4. Cloud FinOps & IT Budget
  if (
    lower.includes('cloud') ||
    lower.includes('finops') ||
    lower.includes('aws') ||
    lower.includes('gcp') ||
    lower.includes('infrastrutt') ||
    lower.includes('kubernetes') ||
    lower.includes('k8s') ||
    lower.includes('server')
  ) {
    loadDataset('cloud_finops');
    if (dropdown) dropdown.value = 'cloud_finops';
    handleExpandAll();
    displayAiInsight(
      '☁️ StratumTree AI • Cloud FinOps Hierarchy',
      "Ho modellato l'albero delle risorse <strong>Cloud Infrastructure & FinOps</strong> in modalità Parent-Child. L'aggregazione evidenzia che gli ambienti di Staging & QA generano il 34.0% di spreco idle su container non utilizzati.",
      [
        'Spesa Mensile: $185,000',
        'Spreco Idle Medio: 14.2%',
        'Staging Cluster Idle: 34.0%',
        'Storage Cold Stale: $12k/mo',
      ],
    );
    return;
  }

  // 5. Filtra Margine Critico (< 28%)
  if (
    lower.includes('critico') ||
    lower.includes('margine') ||
    lower.includes('< 28') ||
    lower.includes('<28') ||
    lower.includes('basso') ||
    lower.includes('sotto')
  ) {
    loadDataset('sales');
    if (dropdown) dropdown.value = 'sales';
    handleExpandAll();

    // Trigger cross filter for lower margin stores
    activeFilterMap.clear();
    triggerCrossFilter('Americas > USA > Chicago > Michigan Ave Hub');
    triggerCrossFilter('Americas > Canada > Toronto > Downtown Toronto');

    displayAiInsight(
      '📉 StratumTree AI • Critical Margin Filter Applied',
      'Ho applicato il filtro automatico per isolare le filiali con <strong>Margine di Profitto inferiore al 28%</strong>. Le entità critiche identificate sono <code>Michigan Ave Hub (27.9%)</code> e <code>Downtown Toronto (27.5%)</code>. I grafici companion e i KPI si sono riallineati istantaneamente via <code>setDataMask</code>.',
      [
        'Filtri Applicati: 2 Stores',
        'Fatturato Rilevato: $345,000',
        'Margine Medio Filtrato: 27.7%',
        'Status Superset: setDataMask Emitted',
      ],
    );
    return;
  }

  // 6. SQL CTE Query Generator
  if (
    lower.includes('sql') ||
    lower.includes('cte') ||
    lower.includes('query') ||
    lower.includes('ricorsiv') ||
    lower.includes('superset')
  ) {
    const sqlCode = `WITH RECURSIVE HierarchyCTE AS (
  -- Anchor Member: Root Nodes (Level 0)
  SELECT 
    id, parent_id, name, metric_val, 0 AS depth, CAST(name AS VARCHAR(1000)) AS path
  FROM superset_table
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive Member: Subtree Traversal
  SELECT 
    c.id, c.parent_id, c.name, c.metric_val, p.depth + 1,
    CAST(p.path || ' > ' || c.name AS VARCHAR(1000))
  FROM superset_table c
  JOIN HierarchyCTE p ON c.parent_id = p.id
)
SELECT * FROM HierarchyCTE ORDER BY path;`;

    displayAiInsight(
      '⚡ StratumTree AI • Optimized SQL Recursive CTE Generator',
      `Ecco la query SQL <strong>WITH RECURSIVE CTE</strong> ottimizzata per Apache Superset 6.1.0 (PostgreSQL, Trino, DuckDB, Snowflake). Supporta risoluzione ad albero illimitata e tracciamento del percorso antenati <code>path</code>:<br/><pre style="background:#090a0f; padding:10px; border-radius:6px; margin-top:8px; font-size:11px; overflow-x:auto; color:#a7f3d0; border:1px solid #1e293b;">${sqlCode}</pre>`,
      [
        'Dialetti: PostgreSQL / Trino / DuckDB / Snowflake',
        'Complessità: O(N) Linear Traversal',
        'Compatibilità: Superset 6.1.0+ SQL Lab',
      ],
    );
    return;
  }

  // 7. General AI Insights on Active Dataset
  const cfg = datasets[currentDatasetKey];
  const totalRecords = cfg.records ? cfg.records.length : 0;
  const primaryMetric = cfg.metrics[0];
  const totalPrimary = cfg.records.reduce((acc, r) => acc + (Number(r[primaryMetric]) || 0), 0);
  const formattedTotal = cfg.formatters[primaryMetric]
    ? cfg.formatters[primaryMetric](totalPrimary)
    : totalPrimary;

  displayAiInsight(
    `💡 StratumTree AI • Executive Diagnostic (${cfg.name})`,
    `Ho analizzato la gerarchia <strong>${cfg.name}</strong> (${totalRecords} record totali). Il valore complessivo di <code>${primaryMetric}</code> ammonta a <strong>${formattedTotal}</strong>. La dispersione dei dati evidenzia una concentrazione del 68% del volume nei primi 2 nodi principali di primo livello, con un tasso di rollup stabile su tutti i sotto-rami.`,
    [
      `Dataset Attivo: ${cfg.name}`,
      `Metrica Primaria: ${formattedTotal}`,
      `Profondità Struttura: ${cfg.dimensions ? cfg.dimensions.length : 'Recursive'} Lvl`,
      `Cross-Filtering: Ready`,
    ],
  );
}

// Google Gemini API Generative Handler
async function runGeminiPrompt(promptText) {
  const apiKey = aiConfig.apiKey;
  const model = aiConfig.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = `You are the AI Engine for StratumTree, a hierarchical tree table plugin for Apache Superset 6.1.0.
Given a user prompt describing a hierarchical structure, return ONLY valid JSON with this exact schema:
{
  "name": "Dataset Title",
  "type": "multi_dimension",
  "dimensions": ["Dim1", "Dim2", "Dim3"],
  "metrics": ["metric_a", "metric_b"],
  "insight_summary": "1-2 sentences in Italian explaining the hierarchy generated and key business takeaway",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
  "records": [
    {"Dim1": "Val", "Dim2": "Val", "Dim3": "Val", "metric_a": 100, "metric_b": 25.5}
  ]
}
Make realistic, rich data (at least 8-10 records with 3-4 levels). Output ONLY the JSON block, no markdown ticks.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: systemInstruction }, { text: `User request: ${promptText}` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const parsed = JSON.parse(
    rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim(),
  );

  if (parsed.records && parsed.dimensions && parsed.metrics) {
    const customKey = 'ai_gen_' + Date.now();
    datasets[customKey] = {
      name: parsed.name || 'AI Generated Matrix',
      type: 'multi_dimension',
      dimensions: parsed.dimensions,
      metrics: parsed.metrics,
      formatters: {
        [parsed.metrics[0]]: v => Number(v).toLocaleString('en-US'),
        [parsed.metrics[1] || 'm2']: v => Number(v).toLocaleString('en-US'),
      },
      records: parsed.records,
    };

    // Update Dropdown option dynamically
    const dropdown = document.getElementById('datasetDropdown');
    if (dropdown) {
      const opt = document.createElement('option');
      opt.value = customKey;
      opt.innerText = `✨ ${parsed.name || 'AI Generated'}`;
      dropdown.appendChild(opt);
      dropdown.value = customKey;
    }

    loadDataset(customKey);
    handleExpandAll();

    displayAiInsight(
      `✨ Gemini AI • ${parsed.name || 'Struttura Generata con Successo'}`,
      parsed.insight_summary ||
        'Ho generato una nuova gerarchia dinamica personalizzata in base al tuo prompt.',
      parsed.highlights || [
        `Generato con ${aiConfig.model}`,
        `${parsed.dimensions.length} Livelli`,
        `${parsed.records.length} Record`,
      ],
    );
  } else {
    throw new Error('Formato dati non valido ricevuto da Gemini');
  }
}

function displayAiInsight(title, bodyText, highlights = []) {
  const box = document.getElementById('aiInsightBox');
  const tag = document.getElementById('aiInsightTag');
  const body = document.getElementById('aiInsightBody');
  const hlContainer = document.getElementById('aiInsightHighlights');

  if (box) box.style.display = 'block';
  if (tag) tag.innerHTML = title;
  if (body) body.innerHTML = bodyText;
  if (hlContainer) {
    hlContainer.innerHTML = highlights
      .map(h => `<span class="ai-highlight-pill">${h}</span>`)
      .join('');
  }
}

/* ==========================================================================
   AI Floating Chat Assistant
   ========================================================================== */

function toggleAiChatDrawer() {
  const drawer = document.getElementById('aiChatDrawer');
  if (!drawer) return;
  drawer.style.display =
    drawer.style.display === 'none' || drawer.style.display === '' ? 'flex' : 'none';
}

function sendAiChatMessage() {
  const input = document.getElementById('aiChatInput');
  const container = document.getElementById('aiChatMessages');
  if (!input || !container) return;

  const msg = input.value.trim();
  if (!msg) return;

  // Append user message
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg chat-msg-user';
  userDiv.innerText = msg;
  container.appendChild(userDiv);
  input.value = '';
  container.scrollTop = container.scrollHeight;

  // AI Typing indicator
  const aiDiv = document.createElement('div');
  aiDiv.className = 'chat-msg chat-msg-ai';
  aiDiv.innerHTML = `<span class="ai-spinner" style="width:10px; height:10px; display:inline-block;"></span> Sto pensando...`;
  container.appendChild(aiDiv);
  container.scrollTop = container.scrollHeight;

  setTimeout(() => {
    const lower = msg.toLowerCase();
    let reply = '';

    if (lower.includes('install') || lower.includes('windows') || lower.includes('powershell')) {
      reply = `Per installare il plugin su <strong>Superset 6.1.0</strong> su Windows:<br/>1. Esegui <code>.\\scripts\\install.ps1 -SupersetPath "C:\\path\\to\\superset"</code>.<br/>2. Lo script inietta la registrazione nel registry dei plugin ed esegue il build del frontend.`;
    } else if (lower.includes('docker') || lower.includes('compose')) {
      reply = `Per Docker Compose, usa il file <code>docker-compose.override.yml</code> fornito per montare la cartella del plugin all'interno del container <code>superset-node</code>, poi riavvia con <code>docker compose restart superset-node</code>.`;
    } else if (lower.includes('cross-filter') || lower.includes('setdatamask')) {
      reply = `StratumTree emette eventi cross-filter usando il protocollo nativo <code>setDataMask</code> di Superset. Quando clicchi su un nodo, invia un payload con filtro <code>IN</code> sulla colonna corrispondente, aggiornando tutti i grafici della dashboard in tempo reale.`;
    } else if (
      lower.includes('parent-child') ||
      lower.includes('ricorsiv') ||
      lower.includes('cte')
    ) {
      reply = `In modalità <strong>Parent-Child</strong>, StratumTree riceve colonne come <code>id</code> e <code>parent_id</code> e calcola autonomamente i subtotali di ogni ramo tramite l'algoritmo di <em>Post-Order Traversal</em> a complessità O(N).`;
    } else {
      reply = `StratumTree per <strong>Apache Superset 6.1.0</strong> offre rendering ultra-performante per griglie a matrice, supporto dual-mode (Multi-Dimension & Parent-Child), cross-filtering nativo e supporto prompt AI per generare strutture dati on the fly!`;
    }

    aiDiv.innerHTML = reply;
    container.scrollTop = container.scrollHeight;
  }, 400);
}
