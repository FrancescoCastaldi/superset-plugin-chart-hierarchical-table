---
name: repo-codemap
description: Generates, updates, and navigates a structured, token-efficient codebase map (Codemap) and AGENTS.md guide for AI coding assistants. Use whenever you need to explore or document repository architecture, file responsibilities, component dependencies, and entry points.
---

# Repository Codemap & Architectural Mapping Skill

This skill provides a standardized framework for mapping, documenting, and maintaining a high-fidelity **Codemap** for AI coding assistants and developers.

## 🎯 When to Use
- When onboarding an AI agent to a new or restructured repository.
- When generating or updating `AGENTS.md` / `CLAUDE.md`.
- When navigating cross-package dependencies in a monorepo.
- When auditing file responsibilities and architectural layers.

---

## 📐 Codemap Structure Standard

A complete repository Codemap must categorize every artifact by:
1. **Module / Package**: Name and primary domain.
2. **File Path**: Relative path from repository root.
3. **Role & Responsibility**: 1-2 sentence concise summary of purpose.
4. **Key Exports / Symbols**: Classes, functions, interfaces, or CLI commands exposed.
5. **Dependencies & Interactions**: Which other files or external packages it depends on or affects.

### Classification Categories:
- `[Core/Plugin]`: Primary visualization plugin entry points and lifecycle managers.
- `[UI/Component]`: Visual React components, styling, and DOM rendering.
- `[Processor/Engine]`: Data transformation, mathematical aggregations, and tree algorithms.
- `[Query/CTE]`: SQL generation and database querying logic.
- `[Type/Schema]`: TypeScript interfaces, types, and schema validations.
- `[Tool/Script]`: Automation, installation, and deployment scripts.
- `[Config]`: Build, formatting, and compiler configurations.
- `[Doc/Guide]`: Architecture, installation, and usage documentation.
- `[Example/Fixture]`: Sample datasets and test fixtures.

---

## 🛠️ Maintenance Workflow

Whenever files are added, moved, or deleted:
1. **Scan Directory Tree**: Run `git ls-files` or `tree -I 'node_modules|dist|build|venv|.git'` to list active project files.
2. **Update Codemap Table**: Ensure every new file is documented in `AGENTS.md`.
3. **Verify Links**: Ensure relative file references and markdown links are valid.
4. **Maintain Invariants**: Ensure critical project rules (e.g., sole maintainer, target Superset version 6.1.0) remain prominent.
