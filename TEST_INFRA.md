# E2E Test Infra: Archon Frontend

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Equivalence Partitioning + BVA + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Cross) |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Boot Screen State | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ |
| 2 | Sidebar Layout & Resizing | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ |
| 3 | Calendar Widget & Modal | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ |
| 4 | File Viewer Tab Persistence | ORIGINAL_REQUEST R4 | 5 | 5 | ✓ |
| 5 | WebSocket Secure Proxy Mappings | ORIGINAL_REQUEST R5 | 5 | 5 | ✓ |
| 6 | Production Build size | ORIGINAL_REQUEST R6 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: vitest or playwright or a custom node script running JSDOM and checking components behavior.
- Test case format: Automated unit/integration tests and E2E checks in rontend/AI-OS-GUI/artifacts/archon/tests/.
- Directory layout:
  - rontend/AI-OS-GUI/artifacts/archon/tests/

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full App Load & Boot | F1, F5 | Medium |
| 2 | Workspace Layout Customization | F2, F4 | Medium |
| 3 | Calendar & Event Details Interaction | F3 | High |
| 4 | File Inspection & Active Tabs | F4, F2 | High |
| 5 | Secure Replit Proxy WebSocket Connection | F5 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
