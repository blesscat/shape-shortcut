# workers-static-deployment Specification

## Purpose

Provide repeatable static hosting on Cloudflare Workers while preserving the
localized browser CAD experience and a reversible migration from Pages.

## Requirements

### Requirement: Static delivery without application server execution

The deployment SHALL serve prebuilt pages and assets through static hosting.
CAD generation and export SHALL continue in the user's browser, and ordinary
page and asset requests MUST NOT require an application server invocation or
an additional paid storage service.

#### Scenario: Deploy an existing production build
- **WHEN** the deployment tool validates the production artifact
- **THEN** it SHALL accept the artifact as an assets-only deployment without an application Worker script

#### Scenario: Generate and download a model
- **WHEN** a user opens a localized CAD workspace on the hosted production build
- **THEN** its browser Worker SHALL initialize the CAD kernel and generate a model
- **AND** the user SHALL be able to download a nonempty valid binary STL
- **AND** existing model IDs and component parameters SHALL be preserved

### Requirement: Localized routes and permanent legacy redirects

The host SHALL serve both supported locales with the existing directory-index
trailing-slash behavior. Legacy home, model chooser, docs, About, and CAD paths
SHALL issue HTTP 308 redirects to the corresponding Traditional Chinese paths,
preserving the request query string and hostname.

#### Scenario: Legacy CAD link contains context
- **WHEN** a client requests `/cad/opengrid?system=desk`
- **THEN** the host SHALL return HTTP 308 to the Traditional Chinese model route on the same origin with `system=desk` preserved

#### Scenario: About links reach their localized page
- **WHEN** a client requests `/about` or `/about/` with query parameters
- **THEN** the host SHALL return HTTP 308 to `/zh-Hant/about/` with those parameters preserved

#### Scenario: English directory route is opened without a slash
- **WHEN** a client opens `/en/models`
- **THEN** the host SHALL resolve it to `/en/models/` and serve English HTML
- **AND** it SHALL NOT redirect to the Traditional Chinese locale

### Requirement: Unknown resources return an honest not-found response

The host MUST return HTTP 404 for unknown localized pages and missing static
assets instead of returning the homepage with a successful status.

#### Scenario: A requested page does not exist
- **WHEN** a client requests a nonexistent path under either locale
- **THEN** the response SHALL have HTTP status 404

#### Scenario: A requested asset does not exist
- **WHEN** a client requests a missing JavaScript or WASM asset
- **THEN** the response SHALL have HTTP status 404

### Requirement: Static metadata and kernel assets survive migration

Localized pages SHALL retain their language, canonical URL and reciprocal
language alternatives, and the sitemap SHALL retain the configured production
origin. The CAD WASM resource SHALL be delivered as a valid WebAssembly binary
with the WebAssembly content type.

#### Scenario: A crawler reads either locale without JavaScript
- **WHEN** a crawler requests a localized public page
- **THEN** its initial HTML SHALL contain the corresponding language and production-origin canonical and alternate links

#### Scenario: The browser fetches the kernel
- **WHEN** the browser requests `/replicad_single.wasm`
- **THEN** the response SHALL be HTTP 200 with `application/wasm` content type and a WebAssembly binary payload

### Requirement: Repeatable deployment and reversible rollout

The repository SHALL provide documented commands to build, preview, verify,
and deploy the static site. Its rollout documentation SHALL cover Git builds,
preview deployments, build-time settings, validation before domain transfer,
the production cutover, and rollback to the retained Pages deployment.

#### Scenario: Validate locally before publishing
- **WHEN** a contributor runs the documented hosting verification command
- **THEN** it SHALL build the production artifact and exercise HTTP and browser behavior through the Workers local runtime

#### Scenario: Configure automatic deployment after merge
- **WHEN** an operator follows the rollout runbook
- **THEN** the instructions SHALL identify the production and preview commands and required build-time tool and public environment settings
- **AND** candidate validation SHALL precede production domain transfer

#### Scenario: Recover from a failed domain cutover
- **WHEN** production checks fail after transferring the hostname
- **THEN** the runbook SHALL describe restoring the retained Pages domain/deployment and automatic builds
- **AND** default candidate deployment SHALL NOT automatically claim the production hostname
