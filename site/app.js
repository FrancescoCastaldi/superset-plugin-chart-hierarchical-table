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
});
