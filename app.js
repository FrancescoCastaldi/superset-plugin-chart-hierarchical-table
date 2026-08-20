// Apache Superset 6.1.0 - Hierarchical Table Interactive App Logic

const datasets = {
  sales: {
    name: 'Sales Geography',
    type: 'multi_dimension',
    dimensions: ['region', 'country', 'city', 'store_name'],
    metrics: ['revenue', 'units_sold', 'profit_margin'],
    formatters: {
      revenue: v => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      units_sold: v => Number(v).toLocaleString('en-US'),
      profit_margin: v => Number(v).toFixed(1) + '%',
    },
    records: [
      { region: 'Americas', country: 'USA', city: 'New York', store_name: '5th Avenue Flagship', revenue: 320000, units_sold: 920, profit_margin: 28.5 },
      { region: 'Americas', country: 'USA', city: 'San Francisco', store_name: 'Market Street Store', revenue: 280000, units_sold: 810, profit_margin: 28.1 },
      { region: 'Americas', country: 'USA', city: 'Chicago', store_name: 'Michigan Ave Hub', revenue: 195000, units_sold: 560, profit_margin: 27.9 },
      { region: 'Americas', country: 'Canada', city: 'Toronto', store_name: 'Downtown Toronto', revenue: 150000, units_sold: 440, profit_margin: 27.5 },
      { region: 'Americas', country: 'Canada', city: 'Vancouver', store_name: 'Robson Street', revenue: 120000, units_sold: 360, profit_margin: 28.0 },
      { region: 'EMEA', country: 'Italy', city: 'Milan', store_name: 'Duomo Flagship', revenue: 145000, units_sold: 420, profit_margin: 31.2 },
      { region: 'EMEA', country: 'Italy', city: 'Rome', store_name: 'Colosseo Store', revenue: 122000, units_sold: 380, profit_margin: 30.5 },
      { region: 'EMEA', country: 'Germany', city: 'Berlin', store_name: 'Mitte Store', revenue: 165000, units_sold: 490, profit_margin: 29.8 },
      { region: 'EMEA', country: 'Germany', city: 'Munich', store_name: 'Marienplatz Hub', revenue: 180000, units_sold: 520, profit_margin: 30.1 },
      { region: 'EMEA', country: 'France', city: 'Paris', store_name: 'Champs-Elysees', revenue: 210000, units_sold: 610, profit_margin: 32.0 },
      { region: 'APAC', country: 'Japan', city: 'Tokyo', store_name: 'Shibuya Hub', revenue: 240000, units_sold: 750, profit_margin: 33.4 },
      { region: 'APAC', country: 'Japan', city: 'Osaka', store_name: 'Umeda Center', revenue: 135000, units_sold: 410, profit_margin: 31.8 },
      { region: 'APAC', country: 'Singapore', city: 'Singapore', store_name: 'Marina Bay Store', revenue: 190000, units_sold: 580, profit_margin: 34.0 },
    ]
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
      { employee_id: '1', manager_id: null, name: 'Elena Rossi (Chief Executive Officer)', salary: 220000, budget_managed: 5000000 },
      { employee_id: '2', manager_id: '1', name: 'Marco Bianchi (Chief Technology Officer)', salary: 160000, budget_managed: 2000000 },
      { employee_id: '3', manager_id: '1', name: 'Giulia Verdi (Chief Marketing Officer)', salary: 150000, budget_managed: 1500000 },
      { employee_id: '4', manager_id: '1', name: 'Davide Neri (Chief Financial Officer)', salary: 155000, budget_managed: 1000000 },
      { employee_id: '5', manager_id: '2', name: 'Luca Ferrari (VP Software Architecture)', salary: 125000, budget_managed: 800000 },
      { employee_id: '6', manager_id: '2', name: 'Sara Romano (VP Cloud & DevOps)', salary: 120000, budget_managed: 700000 },
      { employee_id: '7', manager_id: '5', name: 'Alessandro Galli (Staff Data Engineer)', salary: 90000, budget_managed: 150000 },
      { employee_id: '8', manager_id: '5', name: 'Chiara Costa (Staff Frontend Engineer)', salary: 88000, budget_managed: 120000 },
      { employee_id: '9', manager_id: '3', name: 'Matteo Fontana (Head of Growth Marketing)', salary: 95000, budget_managed: 600000 },
    ]
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
      { account_code: '1000', parent_account_code: null, account_name: 'Ricavi Totali', q1_actual: 750000, q2_actual: 820000, full_year_budget: 3200000 },
      { account_code: '1100', parent_account_code: '1000', account_name: 'Ricavi Abbonamenti SaaS', q1_actual: 500000, q2_actual: 560000, full_year_budget: 2200000 },
      { account_code: '1200', parent_account_code: '1000', account_name: 'Servizi Professionali & Consulenza', q1_actual: 250000, q2_actual: 260000, full_year_budget: 1000000 },
      { account_code: '2000', parent_account_code: null, account_name: 'Costi Operativi (OPEX)', q1_actual: 420000, q2_actual: 450000, full_year_budget: 1800000 },
      { account_code: '2100', parent_account_code: '2000', account_name: 'Personale & Salari', q1_actual: 280000, q2_actual: 295000, full_year_budget: 1200000 },
      { account_code: '2200', parent_account_code: '2000', account_name: 'Infrastruttura Cloud AWS/GCP', q1_actual: 85000, q2_actual: 92000, full_year_budget: 360000 },
      { account_code: '2300', parent_account_code: '2000', account_name: 'Marketing & Digital Acquisition', q1_actual: 55000, q2_actual: 63000, full_year_budget: 240000 },
      { account_code: '3000', parent_account_code: null, account_name: 'Margine Operativo Lordo (EBITDA)', q1_actual: 330000, q2_actual: 370000, full_year_budget: 1400000 },
    ]
  }
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
          childrenMap: isLeaf ? null : new Map()
        };
        if (isLeaf) {
          metrics.forEach(m => node.metrics[m] = Number(record[m]) || 0);
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
    metrics.forEach(m => mValues[m] = Number(r[m]) || 0);

    nodeMap.set(id, {
      key: id,
      name,
      depth: 0,
      path: [name],
      isLeaf: true,
      metrics: mValues
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
    metrics: gMetrics
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
        children: matchingChildren.length > 0 ? matchingChildren : n.children
      };
    }
    return null;
  }

  return nodes.map(filterNode).filter(Boolean);
}

let activeFilterKey = null;
let activeFilterLabel = null;

// --- Table Rendering ---
function renderTable() {
  const config = datasets[currentDatasetKey];
  const head = document.getElementById('tableHead');
  const body = document.getElementById('tableBody');
  const filterIndicatorEl = document.getElementById('activeFilterContainer');

  // Active filter badge update
  if (filterIndicatorEl) {
    if (activeFilterLabel) {
      filterIndicatorEl.innerHTML = `
        <div class="active-filter-pill">
          <span>⚡ Filter: <strong>${activeFilterLabel}</strong></span>
          <button type="button" class="filter-pill-clear" onclick="clearActiveFilter()" title="Clear filter">✕</button>
        </div>
      `;
    } else {
      filterIndicatorEl.innerHTML = '';
    }
  }

  // Header
  let headerHTML = '<tr><th>Hierarchy Level</th>';
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
      const isFilterSelected = activeFilterKey === n.key;
      const indent = n.depth * 24;

      bodyHTML += `
        <tr class="${isFilterSelected ? 'selected-filter-row' : ''}">
          <td style="padding-left: ${indent + 18}px;">
            ${hasChildren ? `
              <span class="node-btn" onclick="toggleNode('${n.key}')">${isExpanded ? '−' : '+'}</span>
            ` : '<span style="display:inline-block; width:28px;"></span>'}
            <span
              class="node-name-link ${hasChildren ? 'node-parent' : ''} ${isFilterSelected ? 'node-filter-active' : ''}"
              onclick="triggerCrossFilter('${n.dimension || 'Hierarchy'}', '${n.name}', '${n.key}')"
              title="Click to ${isFilterSelected ? 'clear filter' : 'filter entire dashboard by ' + n.name}"
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

function toggleNode(key) {
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

// Companion Charts Update Logic
function updateCompanionCharts() {
  const config = datasets[currentDatasetKey];
  const kpiValEl = document.getElementById('kpiBigNumber');
  const kpiLabelEl = document.getElementById('kpiSubLabel');
  const barListEl = document.getElementById('companionBarList');
  const sidebarFilterEl = document.getElementById('sidebarFilterStatus');

  // Find active node or default to grand total
  let targetNode = null;
  if (activeFilterKey) {
    function findNode(nodes) {
      for (const n of nodes) {
        if (n.key === activeFilterKey) return n;
        if (n.children) {
          const found = findNode(n.children);
          if (found) return found;
        }
      }
      return null;
    }
    targetNode = findNode(currentTree);
  }

  const grandTotal = computeGrandTotal(currentTree, config.metrics);
  const primaryMetric = config.metrics[0];

  // 1. Update KPI Big Number
  if (kpiValEl && kpiLabelEl) {
    if (targetNode) {
      kpiValEl.innerText = config.formatters[primaryMetric](targetNode.metrics[primaryMetric]);
      kpiLabelEl.innerText = `${targetNode.name} (${primaryMetric.replace(/_/g, ' ')})`;
    } else {
      kpiValEl.innerText = config.formatters[primaryMetric](grandTotal.metrics[primaryMetric]);
      kpiLabelEl.innerText = `Grand Total (${primaryMetric.replace(/_/g, ' ')})`;
    }
  }

  // 2. Update Sidebar Filters
  if (sidebarFilterEl) {
    if (activeFilterLabel) {
      sidebarFilterEl.innerHTML = `
        <div class="filter-status-tag">
          <span class="tag-head">⚡ ACTIVE CROSS-FILTER</span>
          <strong>${activeFilterLabel}</strong>
          <button type="button" class="btn-sm" style="margin-top:4px; padding:4px 8px; font-size:11px;" onclick="clearActiveFilter()">Clear Filter</button>
        </div>
      `;
    } else {
      sidebarFilterEl.innerHTML = `
        <span style="font-size:12px; color:#94a3b8;">No active cross-filters. Click any row in the Hierarchical Table to filter.</span>
      `;
    }
  }

  // 3. Update Companion Bar Chart
  if (barListEl) {
    let itemsToDisplay = [];
    if (targetNode && targetNode.children && targetNode.children.length > 0) {
      itemsToDisplay = targetNode.children;
    } else if (targetNode) {
      itemsToDisplay = [targetNode];
    } else {
      itemsToDisplay = currentTree;
    }

    const maxVal = Math.max(...itemsToDisplay.map(it => it.metrics[primaryMetric] || 1), 1);

    let barsHTML = '';
    for (const item of itemsToDisplay) {
      const val = item.metrics[primaryMetric] || 0;
      const pct = Math.min(100, Math.max(10, (val / maxVal) * 100));
      barsHTML += `
        <div class="bar-item">
          <div class="bar-meta">
            <span>${item.name}</span>
            <span>${config.formatters[primaryMetric](val)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-progress" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }
    barListEl.innerHTML = barsHTML;
  }
}

function triggerCrossFilter(dim, val, key) {
  const logEl = document.getElementById('consoleLog');
  const timestamp = new Date().toLocaleTimeString();

  if (activeFilterKey === key) {
    // Toggle OFF
    activeFilterKey = null;
    activeFilterLabel = null;
    logEl.innerHTML = `<span style="color:#94a3b8;">[${timestamp}]</span> 🔄 <strong>Cleared Superset Cross-Filter:</strong> { "filterState": null, "extraFormData": {} }`;
  } else {
    // Set Active Filter
    activeFilterKey = key;
    activeFilterLabel = `${dim}: ${val}`;
    logEl.innerHTML = `<span style="color:#38bdf8;">[${timestamp}]</span> ⚡ <strong>Emitted Superset 6.1.0 Cross-Filter (setDataMask):</strong> <pre style="display:inline; color:#a7f3d0;">${JSON.stringify({ [dim]: [val] })}</pre>`;
  }
  renderTable();
  updateCompanionCharts();
}

function clearActiveFilter() {
  const logEl = document.getElementById('consoleLog');
  const timestamp = new Date().toLocaleTimeString();
  activeFilterKey = null;
  activeFilterLabel = null;
  logEl.innerHTML = `<span style="color:#94a3b8;">[${timestamp}]</span> 🔄 <strong>Cleared Superset Cross-Filter</strong>`;
  renderTable();
  updateCompanionCharts();
}

function loadDataset(key) {
  currentDatasetKey = key;
  activeFilterKey = null;
  activeFilterLabel = null;
  const cfg = datasets[key];
  if (cfg.type === 'multi_dimension') {
    currentTree = buildMultiDimensionTree(cfg.records, cfg.dimensions, cfg.metrics);
  } else {
    currentTree = buildParentChildTree(cfg.records, cfg.idCol, cfg.parentIdCol, cfg.labelCol, cfg.metrics);
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
  docker: `# Docker Compose Override (docker-compose.override.yml)\nversion: '3.7'\nservices:\n  superset-node:\n    volumes:\n      - ./superset-frontend/plugins/superset-plugin-chart-hierarchical-table:/app/superset-frontend/plugins/superset-plugin-chart-hierarchical-table`
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
    setTimeout(() => { btn.innerText = 'Copy'; }, 2000);
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  loadDataset('sales');
});
