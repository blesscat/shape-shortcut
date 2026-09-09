## MODIFIED Requirements

### Requirement: 參數驗證與 generation

The workspace MUST ask the selected component definition to validate every
parameter snapshot before sending a model request to the Worker. Every snapshot,
including an invalid snapshot, MUST receive a new generation. A valid snapshot
MUST be synchronized to the Worker only after all fields stop changing for the
configured debounce interval, which is 500 ms by default; the synchronization
MUST use only the latest settled valid snapshot. An invalid snapshot MUST send
`model.invalidate` after the same settling rule, MUST NOT send `model.generate`,
MUST show the component-defined diagnostic, and MUST keep export disabled.
Component-specific ranges, bounds, and normalization rules MUST be owned by the
corresponding catalog or component capability specification.

#### Scenario: Valid component snapshot generates after debounce

- **WHEN** a selected component snapshot passes its owning validator and all fields stop changing for 500 ms
- **THEN** the workspace MUST synchronize only the latest settled snapshot to a newly initialized CAD Worker
- **AND** the workspace MUST send one `model.generate` request with a generation greater than the previous snapshot
- **AND** the Worker request MUST retain the selected stable `modelId`
- **AND** the component-specific capability MUST define the accepted parameters and bounds

#### Scenario: Invalid component snapshot is invalidated

- **WHEN** a snapshot is empty, non-finite, out of range, mismatched, or otherwise rejected by its owning validator
- **THEN** the workspace MUST show the component-defined diagnostic immediately
- **AND** after the debounce interval it MUST send `model.invalidate` rather than `model.generate`
- **AND** the previous committed preview MAY remain visible but MUST be marked stale
- **AND** STEP/STL export MUST remain disabled for the invalid or stale generation

#### Scenario: Debounce keeps only the latest valid snapshot

- **WHEN** the user changes a parameter repeatedly within the 500 ms settling window
- **THEN** the workspace MUST assign generations to the snapshots
- **AND** it MUST send at most one Worker synchronization and one `model.generate` for the latest valid settled snapshot
- **AND** intermediate snapshots MUST NOT each start CAD generation or Worker initialization

### Requirement: Worker 初始化與 CAD 所有權

The system MUST satisfy the following behavior:

OpenCascade WASM、replicad、B-Rep 建模、mesh 產生與 STEP writer 必須位於同一個專用 CAD Worker。主執行緒不得持有或操作 OpenCascade instance。每一個 CAD Worker runtime 內的重複 `engine.init` request MUST reuse the same initialization result and MUST NOT create a second parallel OpenCascade runtime.

#### Scenario: 首次初始化

- **Given** 靜態 Worker 與 WASM asset 可取得
- **When** workspace 啟動 Worker
- **Then** UI 必須呈現 loading-engine 狀態
- **And** Worker 必須在同一 runtime 內初始化 OpenCascade 並注入 replicad
- **And** 初始化成功後才可回傳 engine.ready

#### Scenario: 重複初始化

- **Given** Worker 已成功初始化
- **When** 主執行緒重複送出 engine.init
- **Then** Worker 必須重用同一個 initialization result
- **And** 不得建立第二個並行 OpenCascade runtime

## ADDED Requirements

### Requirement: Bounded model generation deadline

The workspace MUST allow every model's build and mesh generation a dedicated
absolute deadline of 600 seconds from sending `model.generate`. Progress MUST
NOT extend this deadline. Engine initialization MUST retain its 60-second
deadline; candidate commit and exports MUST retain their existing 120-second
deadline. Supersession, invalidation, success and disposal MUST cancel obsolete
timers. A current generation timeout MUST use the existing bounded recovery
policy with a fresh Worker and the same latest valid snapshot.

#### Scenario: Slow generation is allowed to finish

- **WHEN** a current generation takes longer than 120 seconds but returns a valid candidate before 600 seconds
- **THEN** it MUST NOT be terminated at the old 120-second build deadline
- **AND** candidate commit MUST use the existing 120-second operation deadline

#### Scenario: Unfinished generation remains bounded

- **WHEN** a current generation has not returned a candidate within 600 seconds, even if it has reported progress
- **THEN** its Worker MUST be terminated and the bounded recovery policy applied
- **AND** exhausted recovery MUST keep exports disabled and report an error

#### Scenario: New input does not wait for the build deadline

- **WHEN** newer valid input settles during a long generation
- **THEN** the previous Worker MUST be terminated after the normal debounce
- **AND** its obsolete generation timer MUST NOT affect the replacement Worker

### Requirement: 每次合法建模使用獨立 Worker

For every registered CAD model, the workspace MUST use a newly initialized
dedicated CAD Worker for each debounced valid model generation. The previous
Worker MUST be terminated before the new generation starts so its native
OpenCascade resources are no longer part of the active generation's memory
budget. The new Worker MUST receive a new worker epoch, and results from a
terminated or superseded Worker MUST NOT update the preview, current revision,
or export source.

#### Scenario: 合法 generation 重建 Worker

- **WHEN** a valid latest snapshot reaches the end of the debounce interval
- **THEN** the workspace MUST terminate the previous CAD Worker before creating the Worker for that snapshot
- **AND** the new Worker MUST initialize OpenCascade successfully before receiving `model.generate`
- **AND** the new Worker MUST receive exactly one current snapshot for the generation
- **AND** the new Worker epoch MUST differ from the terminated Worker epoch

#### Scenario: 重建期間保留上一個預覽

- **GIVEN** workspace 已有一個 committed preview，且新的 valid generation 正在初始化或建模
- **WHEN** 舊 Worker 被終止並等待新 Worker 回傳 model.ready
- **THEN** viewport MAY continue displaying the previous committed mesh
- **AND** the previous preview MUST be marked stale
- **AND** STEP/STL export MUST remain disabled until the new generation commits successfully
- **AND** the previous preview's dimensions MUST remain associated with the previous committed revision

#### Scenario: 舊 Worker 結果不得回寫

- **GIVEN** a Worker has been terminated or replaced by a newer Worker epoch
- **WHEN** a late candidate, ready event, export event, or error from that Worker reaches the workspace
- **THEN** the workspace MUST ignore it
- **AND** it MUST NOT replace the current preview, model revision, export source, or current Worker epoch

#### Scenario: 初始化不得重複生成

- **WHEN** a replacement Worker emits engine.ready for a pending valid generation
- **THEN** the workspace MUST send only the pending latest snapshot to that Worker
- **AND** it MUST NOT first generate the model's default snapshot as an additional request
- **AND** the pending generation MUST reach a terminal ready or error state

#### Scenario: 非法 snapshot 不啟動新建模

- **WHEN** the latest snapshot is invalid after validation
- **THEN** the workspace MUST invalidate the active generation after debounce
- **AND** it MUST NOT initialize a replacement Worker solely for that invalid snapshot
- **AND** it MUST NOT send `model.generate`
