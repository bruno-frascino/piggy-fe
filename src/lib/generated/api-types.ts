/**
 * GENERATED from contracts/openapi.json by scripts/context/generate-api-types.ts.
 * REFERENCE ONLY — never import this file from app code (components/hooks/pages).
 * src/lib/types.ts is the manually mirrored source of truth (see docs/adr/0007-manual-types-mirror.md).
 * See context/contract-drift.md for a report of any drift between the two.
 */
export interface paths {
    "/api/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List trading accounts for the authenticated user
         * @description Each account includes an immutable `isDemo` flag. Demo accounts are listed here but excluded from tax reports and "All accounts" aggregates.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Trading accounts */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Create (or return existing) trading account for an exchange
         * @description An existing closed account with the same name is explicitly reopened under its account lock. New account creation takes the shared user barrier and refuses users deleted during the request.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /**
                         * @description Practice account. Chosen at creation only and immutable afterwards. Demo accounts are excluded from ATO tax reports and from "All accounts" aggregates. Ignored when an account with this name already exists.
                         * @default false
                         */
                        isDemo?: boolean;
                        /** @example Main */
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Existing account returned */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Exchange not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/accounts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete a trading account
         * @description Permanently deletes a trading account owned by the authenticated user, along with its derived performance history (portfolio snapshots). Demo accounts are deleted together with everything that belongs to them (positions, transactions, snapshots). For non-demo accounts, refuses to delete an account that still has positions, or one that is referenced by a generated tax report — close the account instead to preserve that history. Ownership and retention checks run under the same account lock as participating trade/import writes and new tax-report references. Deletion cascades inactive opening drafts, draft cash operations and import batches; it does not confirm or activate accounting.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Account deleted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Non-demo account has positions or is used by a tax report */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update a trading account
         * @description Rename a trading account. The `isDemo` flag is immutable; sending it returns 400. Ownership, name conflict checks and update execute under the account lock.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @example Updated Account Name */
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Account updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error, or an attempt to change the immutable isDemo flag */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account name already exists for this user */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        trace?: never;
    };
    "/api/accounts/{id}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Close a trading account while preserving history
         * @description Locks the owned account and checks current open/partial parcels in the same transaction. Reopen before adding new open holdings; historical corrections that leave parcels closed remain allowed. Inactive opening drafts are preserved and never activated.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Account closed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account still has open positions */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/accounts/{id}/opening-preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Preview opening inventory and trade-only cash without saving financial data
         * @description Read-only end-of-day Australia/Sydney reconciliation. It cannot confirm or enable accounting. Missing funding is never invented. Limited to 5000 parcels, 500 import batches, 50000 transactions and 10000 relevant import events; exceeding any limit returns 422.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        cashBalances: {
                            /** @description Explicit non-negative decimal balance. */
                            amount: string;
                            /** @description Supported ISO currency; unique within request. */
                            currency: string;
                        }[];
                        /**
                         * Format: date
                         * @description Valid calendar date no later than today in Australia/Sydney.
                         */
                        openingDate: string;
                    };
                };
            };
            responses: {
                /** @description Preview only, including blockers and incomplete-cash-history warning. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                accountId: string;
                                /** Format: date */
                                asOfDate: string;
                                /** @enum {string} */
                                boundary: "END_OF_DAY";
                                cashBalances: {
                                    currency: string;
                                    minimumTradeOnlyAmount: string;
                                    openingAmount: string;
                                    tradeOnlyEndingAmount: string;
                                }[];
                                counts: {
                                    blockingIssues: number;
                                    parcels: number;
                                    postBoundaryTrades: number;
                                };
                                issues: {
                                    code: string;
                                    message: string;
                                    /** @enum {string} */
                                    severity: "BLOCKING" | "WARNING";
                                    sourceId: string | null;
                                }[];
                                /** @enum {string} */
                                mode: "PREVIEW_ONLY";
                                /** Format: date */
                                openingDate: string;
                                parcels: {
                                    currency: string;
                                    expectedCurrentQuantity: string;
                                    openingQuantity: string;
                                    positionId: string;
                                    recordedCurrentQuantity: string;
                                    symbol: string;
                                }[];
                                /** @description Snapshot fingerprint */
                                sourceFingerprint: string;
                                /** @enum {string} */
                                timezone: "Australia/Sydney";
                            };
                            success: boolean;
                        };
                    };
                };
                /** @description Invalid date, currency or decimal balance. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Authentication required. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account not owned by the authenticated user or not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account exceeds the interactive preview limit. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/accounts/{id}/opening-statements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List inactive opening draft revisions newest first
         * @description Returns up to 20 revisions with explicit cash balances and parcel counts. Saved snapshots are not current account valuations. Closed accounts retain access; drafts are removed with account/user deletion.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Exclusive cursor from nextBeforeVersion. */
                    beforeVersion?: number;
                };
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Inactive statement revision page. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                nextBeforeVersion: number | null;
                                statements: components["schemas"]["OpeningStatement"][];
                            };
                            success: boolean;
                        };
                    };
                };
                /** @description Invalid account ID or cursor. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Authentication required. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account not found or not owned. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Save a reviewed opening preview as an immutable inactive draft
         * @description Saves a new revision only if the fingerprint matches the current snapshot and inputs. Same fingerprint and normalized inputs returns the existing revision. Drafts may retain reconciliation blockers; saving never creates cash postings, enables accounting or modifies trades. Negative or unrepresentable opening inventory is rejected.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        cashBalances: {
                            amount: string;
                            /** @description Supported unique ISO currency. */
                            currency: string;
                        }[];
                        /**
                         * Format: date
                         * @description End-of-day Sydney calendar date no later than today.
                         */
                        openingDate: string;
                        sourceFingerprint: string;
                    };
                };
            };
            responses: {
                /** @description New or existing inactive draft. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                created: boolean;
                                statement: components["schemas"]["OpeningStatement"];
                            };
                            success: boolean;
                        };
                    };
                };
                /** @description Invalid date */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Authentication required. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account not found or not owned. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale preview */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Preview exceeds limits or opening inventory cannot be saved precisely. */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/accounts/{id}/reopen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reopen a closed trading account
         * @description Serializes reopening with account lifecycle and participating trade/import writes.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Account reopened */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/forgot-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Request a password reset link
         * @description Emails a reset link to the address if it is registered. Always responds with 200 regardless of whether the email exists or whether delivery succeeded (prevents user enumeration). In non-production environments the `resetToken` field is also included in the response for testing. Reset-token replacement is atomic under an exclusive user lock. Users deleted or purged during the request receive the same generic response without a token.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: email */
                        email: string;
                    };
                };
            };
            responses: {
                /** @description Request accepted (same response whether email exists or not) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            message?: string;
                            /** @description Included only in non-production environments */
                            resetToken?: string;
                            success?: boolean;
                        };
                    };
                };
                /** @description Too many reset requests for this IP/email */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Sign in with email and password
         * @description Session persistence rechecks the user and verified password under a shared user lock. A deletion or password change during authentication fails instead of creating a late session.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: email */
                        email: string;
                        password: string;
                    };
                };
            };
            responses: {
                /** @description Authenticated — returns user object + accessToken + refreshToken */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                accessToken?: string;
                                refreshToken?: string;
                                user?: components["schemas"]["User"];
                            };
                            success?: boolean;
                        };
                    };
                };
                /** @description Invalid credentials */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Account is scheduled for deletion — restore it to sign in */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Revoke the current refresh token and sign out */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /** @description The refresh token to revoke */
                        refreshToken?: string;
                    };
                };
            };
            responses: {
                /** @description Logged out successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing or invalid access token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Exchange a refresh token for a new access + refresh token pair (rotation)
         * @description Rechecks active user state under a shared user lock and atomically replaces an owned, unexpired token. Concurrent rotations succeed at most once; deletion cannot leave a late replacement session.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        refreshToken: string;
                    };
                };
            };
            responses: {
                /** @description New token pair issued */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                accessToken?: string;
                                refreshToken?: string;
                            };
                            success?: boolean;
                        };
                    };
                };
                /** @description Invalid or expired refresh token */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Register a new user account */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: email */
                        email: string;
                        name?: string;
                        password: string;
                    };
                };
            };
            responses: {
                /** @description User created — returns user object + accessToken + refreshToken */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                accessToken?: string;
                                refreshToken?: string;
                                user?: components["schemas"]["User"];
                            };
                            success?: boolean;
                        };
                    };
                };
                /** @description Email already registered */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/reset-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Set a new password using a reset token
         * @description Rechecks active user state and consumes an owned, unexpired token under an exclusive user lock. Password replacement and revocation of all reset/refresh tokens commit together. Concurrent completion succeeds at most once; deleted accounts cannot reset.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        password: string;
                        /** @description The reset token from the forgot-password response / email link */
                        token: string;
                    };
                };
            };
            responses: {
                /** @description Password updated successfully */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid or expired reset token */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Cancel a pending account deletion and sign in
         * @description Restoration rechecks the verified password and deletion revision under an exclusive user lock, and restores the account and persists its new session in one transaction. Concurrent restoration/deletion changes return 409; a purged user returns 401. Valid only while the account is inside its deletion grace period. Requires the account password, so a deletion cannot be undone by anyone who merely knows the email address.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: email */
                        email: string;
                        password: string;
                    };
                };
            };
            responses: {
                /** @description Account restored — returns user object + accessToken + refreshToken */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid credentials */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account is not pending deletion */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exchanges": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List exchanges, optionally filtered by asset class */
        get: {
            parameters: {
                query?: {
                    /** @description Only crypto venues (one row per quote currency) or only equity exchanges */
                    assetClass?: "crypto" | "equity";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Exchanges ordered by code */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                code?: string;
                                currency?: string;
                                isCrypto?: boolean;
                                name?: string;
                            }[];
                            success?: boolean;
                        };
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exchanges/kraken/assets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search Kraken spot assets by symbol, alias or common coin name
         * @description Uses Kraken's public pair catalogue (cached for ten minutes). Only AUD and USD quote currencies are supported. Names are provided for common coins; other coins are searchable by ticker. Results describe recorded spot markets, not regional trading eligibility. An empty result means no matching pair, not a provider failure.
         */
        get: {
            parameters: {
                query: {
                    q?: string;
                    quote: "AUD" | "USD";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Up to 30 matching Kraken markets */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                base: string;
                                exchangeCode: string;
                                name: string;
                                /** @enum {string} */
                                quote: "AUD" | "USD";
                                symbol: string;
                            }[];
                            success?: boolean;
                        };
                    };
                };
                /** @description Unsupported quote currency or invalid query */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Kraken market catalogue temporarily unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/imports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the user's import batches */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Batches (newest first) with event counts by status */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Upload exchange CSV exports and build an import plan
         * @description Kraken only for now — both `trades` and `ledgers` CSVs are required. Events already uploaded (same exchange id, including pending review) are counted as duplicates and not stored again. `existingBatches` identifies the previous imports, their status, target account and matching event count so users can resume review. Nothing touches positions until the batch is committed. The target account must be an active, non-demo account owned by the user. Deferred reward reattachment is account-locked and fails with 409 if the event was processed meanwhile. Rate limited to 10 uploads per hour.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        accountId: string;
                        files: {
                            /** @description Raw CSV text */
                            content: string;
                            fileName: string;
                            /** @enum {string} */
                            kind: "trades" | "ledgers";
                        }[];
                        /** @enum {string} */
                        source: "KRAKEN";
                    };
                };
            };
            responses: {
                /** @description Batch created. `data.batch` is null when no new events need storing. Duplicate events may still need review and commit; they do not prove positions exist. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                batch?: {
                                    [key: string]: unknown;
                                } | null;
                                duplicates?: number;
                                eventCounts?: {
                                    [key: string]: number;
                                };
                                existingBatches?: {
                                    accountId: string;
                                    accountName: string;
                                    eventCount: number;
                                    id: string;
                                    /** @enum {string} */
                                    status: "PENDING_REVIEW" | "PARTIALLY_APPLIED" | "COMMITTED" | "DISCARDED" | "FAILED";
                                }[];
                                plan?: {
                                    [key: string]: unknown;
                                } | null;
                                warnings?: string[];
                            };
                            success?: boolean;
                        };
                    };
                };
                /** @description Validation error, missing file or unrecognised CSV format */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Deferred events changed during upload; refresh the existing import */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Upload larger than 10 MB */
                413: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Too many uploads */
                429: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/imports/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get a batch with its full, freshly computed plan
         * @description The plan lists new positions, sells with suggested (FIFO) allocations and eligible parcels, staking months (applied, dust, deferred), unsupported events, blocking issues and the ledger reconciliation.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Batch and plan */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Batch not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Discard a batch and its unapplied events
         * @description Positions already created by the batch are kept.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Batch discarded */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Batch not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/imports/{id}/commit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Apply the plan — create positions and SELL transactions
         * @description Without `eventIds`, applies the whole plan and returns 409 while blocking issues remain. With `eventIds`, applies only those events and returns 409 if an earlier event of the same asset is unresolved or not included. Runs in one database transaction, in chronological order. Locks the owned account, rechecks that it is active and non-demo, and verifies that events and eligible holdings still match the prepared plan before any trade writes. Concurrent changes return 409 and require reviewing a refreshed plan; the import is not silently reallocated. Parcel creation, allocated SELLs, recomputed results and event links commit or roll back together. No live cash postings or opening activation are performed.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        eventIds?: string[];
                    };
                };
            };
            responses: {
                /** @description Created position ids and applied event count */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error or target account is no longer active and non-demo */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Batch not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Blocking issues, chronology violation, discarded batch or concurrent event/holdings changes */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/imports/{id}/events/{eventId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Save the user's resolution for one event
         * @description Skip the event, replace a sell's allocation (specific identification), override the close reason, or enter the AUD value of a staking reward. Returns the updated plan.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    eventId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @description Send null to clear the override and restore the FIFO suggestion */
                        allocations?: {
                            positionRef: string;
                            quantity: string;
                        }[] | null;
                        /** @enum {string|null} */
                        closeReason?: "STOP_LOSS" | "TARGET" | "MANUAL" | "OTHER" | null;
                        fmvAud?: string;
                        skip?: boolean;
                    };
                };
            };
            responses: {
                /** @description Updated plan */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Batch or event not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Event already processed or batch discarded while waiting for the account lock */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        trace?: never;
    };
    "/api/portfolio/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get historical portfolio snapshots (for charting equity curve) */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Array of daily portfolio snapshots ordered by date ascending */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/portfolio/realized-pnl": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Sum realized P&L banked from closed and partially closed positions
         * @description Server-side aggregate for a single account + exchange scope. Exists so the dashboard does not have to download every close event just to total them.
         */
        get: {
            parameters: {
                query: {
                    accountId: string;
                    exchangeCode: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Realized P&L total for the scope */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                realizedPnL?: number;
                            };
                            success?: boolean;
                        };
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/portfolio/snapshot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create or update today's portfolio snapshot
         * @description Upserts a single daily legacy snapshot row under shared-user and owned-account locks. Rereads holdings after locking; a deleted user or account cannot receive a late snapshot. Legacy totals and daily date semantics are unchanged; inactive draft cash is excluded. Call this at end-of-day to record the equity curve.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Snapshot created or updated for today */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account or exchange not found, including an account deleted while waiting for its lock */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/positions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List all positions for the authenticated user */
        get: {
            parameters: {
                query?: {
                    status?: "OPEN" | "CLOSED" | "PARTIAL";
                    assetType?: "EQUITY" | "ETF" | "CRYPTO";
                    /** @description Filter by exchange code (e.g. NYSE, ASX) */
                    exchangeCode?: string;
                    /** @description Filter by trading account ID. When omitted, positions in demo accounts are excluded; pass a demo account's ID to list its positions. */
                    accountId?: string;
                    limit?: number;
                    offset?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Paginated list of positions */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Open a new position
         * @description Creates one acquisition parcel with one BUY. Crypto venues infer CRYPTO when assetType is omitted and require a BASE-QUOTE symbol matching the venue currency. Kraken markets are validated against the public catalogue; an unavailable catalogue returns 503. Alias XBT is stored as BTC. Quantities support up to twelve decimal places. Account resolution and the parcel/BUY write commit together under an owned-account lock. Closed accounts require explicit reopening first. A missing explicit accountId returns 404 rather than redirecting the acquisition to another account. This does not activate or spend inactive draft cash.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @description Existing trading account id (preferred) */
                        accountId?: string;
                        /** @description Trading account name (defaults to Main) */
                        accountName?: string;
                        assetName?: string;
                        /**
                         * @default EQUITY
                         * @enum {string}
                         */
                        assetType?: "EQUITY" | "ETF" | "CRYPTO";
                        /** @default 0 */
                        buyFees?: number;
                        capitalAllocated: number;
                        entryPrice: number;
                        /** @example NASDAQ */
                        exchangeCode: string;
                        industry?: string;
                        notes?: string;
                        /** Format: date-time */
                        openDate: string;
                        openReason?: string;
                        /**
                         * @default LONG
                         * @enum {string}
                         */
                        positionType?: "LONG" | "SHORT";
                        quantity: number;
                        setupType?: string;
                        stopLossPrice?: number;
                        strategy?: string;
                        /** @example AAPL */
                        symbol: string;
                        tags?: string[];
                        takeProfitPrice?: number;
                        timeframe?: string;
                    };
                };
            };
            responses: {
                /** @description Position opened */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid fields or instrument identity */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Exchange or explicitly selected trading account not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Existing asset has an incompatible classification, or trading account must be reopened before adding holdings */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Kraken market validation temporarily unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/positions/close-events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List close events (SELL transactions) for the authenticated user
         * @description Without `accountId`, close events from demo accounts are excluded. Pass a demo account's ID to list its history explicitly.
         */
        get: {
            parameters: {
                query?: {
                    /** @description Only include close events for this trading account (demo accounts allowed) */
                    accountId?: string;
                    /** @description Only include close events on or after this date */
                    dateFrom?: string;
                    /** @description Only include close events on or before this date */
                    dateTo?: string;
                    limit?: number;
                    offset?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Paginated SELL transactions with position and asset context. Each event carries `closeReason` (STOP_LOSS | TARGET | MANUAL | OTHER, or null when unknown). */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: Record<string, never>[];
                            meta?: {
                                limit?: number;
                                offset?: number;
                                total?: number;
                            };
                            success?: boolean;
                        };
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/positions/close-events/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Update a close event (SELL transaction)
         * @description Updates the sale and parcel totals atomically under an owned-account and parcel lock. Does not activate or spend inactive draft cash. Concurrent parcel moves require reload.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: date-time */
                        closeDate?: string;
                        /**
                         * @description Why the position was closed; null clears it (unknown)
                         * @enum {string|null}
                         */
                        closeReason?: "STOP_LOSS" | "TARGET" | "MANUAL" | "OTHER" | null;
                        exitPrice?: number;
                        notes?: string;
                        sellFees?: number;
                    };
                };
            };
            responses: {
                /** @description Updated SELL transaction */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Close event not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Parcel or close event moved concurrently; reload and retry */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        trace?: never;
    };
    "/api/positions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Permanently delete a position and all its transactions
         * @description Deletes under owned-account and parcel locks. Inactive opening and cash draft snapshot references are retained; source changes prevent further draft appends.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Position deleted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Position not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Position moved accounts concurrently; reload and retry */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update a position's acquisition and metadata
         * @description Crypto symbols must match the venue quote currency. Changing a Kraken instrument validates its market; unchanged historical instruments remain editable. Acquisition edits commit the BUY and recomputed parcel results together. Bought units cannot be reduced below already-sold units. Account moves lock both accounts in stable order and recheck the demo/real boundary. Inactive draft cash is not spent or activated. An edit or move that would leave open holdings in a closed account returns 409; reopen the account first. Corrections and moves of fully closed history remain allowed.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        accountId?: string;
                        accountName?: string;
                        assetName?: string;
                        buyFees?: number;
                        /** @description Current market price (used to calculate max drawdown and max run-up) */
                        currentPrice?: number;
                        entryPrice?: number;
                        exchangeCode?: string;
                        industry?: string;
                        lessonsLearned?: string;
                        /** @description Explicit override of the peak gain vs entry price, in percent (null resets it) */
                        maxRunUpPercent?: number | null;
                        notes?: string;
                        /** Format: date-time */
                        openDate?: string;
                        openReason?: string | null;
                        quantity?: number;
                        setupType?: string;
                        /** @description Changing the stop loss restarts stop-loss-reached tracking (clears stopLossHitAt) */
                        stopLossPrice?: number;
                        strategy?: string;
                        symbol?: string;
                        tags?: string[];
                        takeProfitPrice?: number;
                        timeframe?: string;
                        /** @enum {string} */
                        tradeGrade?: "A" | "B" | "C" | "D" | "F";
                        unrealizedPnL?: number;
                    };
                };
            };
            responses: {
                /** @description Position updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error, or the target account is a demo account while the position's current account is real (or vice versa) — positions cannot be moved between demo and real accounts */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Position not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Incompatible asset, concurrent account move, parcel does not have exactly one BUY, or open holdings require account reopening */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Kraken market validation temporarily unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        trace?: never;
    };
    "/api/positions/{id}/check-stop-loss": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Check whether a position's stop loss has been reached and remember it
         * @description For an open long position with a stop loss that is not already flagged, decides whether the stop has been reached and, if so, persists stopLossHitAt so the flag survives the price recovering. If currentPrice is supplied and at or below the stop, the stop is flagged immediately. Otherwise daily lows are scanned from the time the stop was last set (or the open date, if never changed) to today; the first day whose low reached the stop becomes stopLossHitAt (day-granular). Editing the stop loss price clears the flag. Already-flagged, closed, short, or stop-less positions are returned unchanged. Saving rechecks the stop and holding inputs under user/account/parcel locks; concurrent changes return 409 rather than persisting a stale hit.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /** @description Live market price; when at or below the stop the history scan is skipped */
                        currentPrice?: number;
                    };
                };
            };
            responses: {
                /** @description Current stop loss hit state */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            /** Format: date-time */
                            stopLossHitAt?: string | null;
                            success?: boolean;
                        };
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Position not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stop or holding changed during calculation; reload and check again */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/positions/{id}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Close (or partially close) an open position
         * @description Rechecks remaining units under owned-account and parcel locks and commits the SELL and parcel totals together. Concurrent closes cannot sell the same remaining units twice. Does not activate or spend inactive draft cash.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: date-time */
                        closeDate: string;
                        /**
                         * @description Why the position was closed. Defaults to MANUAL when omitted. Whether a stop-out was a loss, break-even or gain is derived from realised P&L, not stored.
                         * @enum {string}
                         */
                        closeReason?: "STOP_LOSS" | "TARGET" | "MANUAL" | "OTHER";
                        exitPrice: number;
                        /** @default 0 */
                        fees?: number;
                        notes?: string;
                        /** @description Omit to close the full position */
                        quantity?: number;
                    };
                };
            };
            responses: {
                /** @description Position closed (or partially closed — status becomes PARTIAL) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Already closed, no remaining units, or requested quantity exceeds remaining units */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Position not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Position moved accounts concurrently; reload and retry */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/positions/{id}/recalculate-drawdown": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Recalculate max drawdown and max run-up from historical data
         * @description Fetches daily OHLC history from the position's open date to today (or to the close date for closed positions, for the run-up), finds the lowest intraday low and persists it as maxDrawdownPercent, and finds the highest intraday high and persists it as maxRunUpPercent (peak unrealized gain vs entry price). Returns the new values (or null if history is unavailable / no drawdown / no run-up). Saving takes user/account/parcel locks and rejects changed calculation inputs with 409.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Recalculation result */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            maxDrawdownPercent?: number | null;
                            maxRunUpPercent?: number | null;
                            message?: string;
                            success?: boolean;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Position not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Position changed during calculation; reload and recalculate */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/screener": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search or filter stocks market-wide (via Financial Modeling Prep) */
        get: {
            parameters: {
                query?: {
                    /** @description Free-text symbol/name search (mutually exclusive with the filter params below) */
                    symbol?: string;
                    marketCapMin?: number;
                    marketCapMax?: number;
                    dividendMin?: number;
                    dividendMax?: number;
                    sector?: string;
                    industry?: string;
                    exchange?: string;
                    limit?: number;
                    page?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Screener results */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Screener provider unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/screener/saved-screens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the authenticated user's saved screener filter presets */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Saved screens */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Save a named screener filter preset */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        filters: Record<string, never>;
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Saved screen created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description A saved screen with this name already exists */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/screener/saved-screens/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete a saved screener filter preset */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deleted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/screener/upcoming-dividends": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Upcoming ex-dividend dates in a date range, optionally filtered by symbol */
        get: {
            parameters: {
                query?: {
                    /** @description Comma-separated symbol list to filter the calendar to */
                    symbols?: string;
                    from?: string;
                    to?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Upcoming dividends */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Screener provider unavailable */
                503: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/statistics/breakdowns": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get grouped portfolio breakdown rows for charts/tables */
        get: {
            parameters: {
                query: {
                    by: "account" | "exchange" | "assetType" | "industry";
                    metric: "marketValue" | "realizedPnL" | "totalPnL";
                    /** @description CSV trading account IDs. When omitted, demo accounts are excluded; pass a demo account's ID to include it. */
                    accountIds?: string;
                    /** @description CSV exchange codes (e.g. NASDAQ, ASX) */
                    exchangeCodes?: string;
                    /** @description CSV asset types */
                    assetTypes?: "EQUITY" | "ETF" | "CRYPTO";
                    /** @description CSV position statuses. Defaults to OPEN,PARTIAL when `metric=marketValue` (closed positions hold nothing); all statuses otherwise. For marketValue, partial positions are prorated to the quantity still held. */
                    status?: "OPEN" | "PARTIAL" | "CLOSED";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Grouped rows with weights. Rows for `by=exchange` also include the exchange's ISO 4217 `currency`. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/statistics/closed-trades": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get paginated closed trade rows for the selected scope */
        get: {
            parameters: {
                query?: {
                    /** @description CSV trading account IDs. When omitted, demo accounts are excluded; pass a demo account's ID to include it. */
                    accountIds?: string;
                    /** @description CSV exchange codes (e.g. NASDAQ, ASX) */
                    exchangeCodes?: string;
                    /** @description CSV asset types */
                    assetTypes?: "EQUITY" | "ETF" | "CRYPTO";
                    dateFrom?: string;
                    dateTo?: string;
                    limit?: number;
                    offset?: number;
                    sortBy?: "closeDate" | "pnl" | "returnPct" | "holdingDays";
                    sortDir?: "asc" | "desc";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Paginated closed trades */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                /** @description ISO 4217 currency code from the trade's exchange */
                                currency?: string;
                            }[];
                            success?: boolean;
                        };
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/statistics/distributions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get histogram distributions for returns, PnL and holding days */
        get: {
            parameters: {
                query?: {
                    /** @description CSV trading account IDs. When omitted, demo accounts are excluded; pass a demo account's ID to include it. */
                    accountIds?: string;
                    /** @description CSV exchange codes (e.g. NASDAQ, ASX) */
                    exchangeCodes?: string;
                    /** @description CSV asset types */
                    assetTypes?: "EQUITY" | "ETF" | "CRYPTO";
                    dateFrom?: string;
                    dateTo?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Histogram buckets for charting */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/statistics/risk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get risk metrics from portfolio snapshot return series */
        get: {
            parameters: {
                query?: {
                    /** @description CSV trading account IDs. When omitted, demo accounts are excluded; pass a demo account's ID to include it. */
                    accountIds?: string;
                    /** @description CSV exchange codes (e.g. NASDAQ, ASX) */
                    exchangeCodes?: string;
                    dateFrom?: string;
                    dateTo?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Volatility, Sharpe and drawdown metrics */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/statistics/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get statistics summary KPIs for the selected scope */
        get: {
            parameters: {
                query?: {
                    /** @description CSV trading account IDs. When omitted, demo accounts are excluded; pass a demo account's ID to include it. */
                    accountIds?: string;
                    /** @description CSV exchange codes (e.g. NASDAQ, ASX) */
                    exchangeCodes?: string;
                    /** @description CSV asset types */
                    assetTypes?: "EQUITY" | "ETF" | "CRYPTO";
                    /** @description CSV position statuses */
                    status?: "OPEN" | "PARTIAL" | "CLOSED";
                    dateFrom?: string;
                    dateTo?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Aggregated summary metrics */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/statistics/timeseries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get time-series points for statistics charts */
        get: {
            parameters: {
                query: {
                    metric: "equity" | "totalPnL" | "realizedPnL";
                    granularity?: "day" | "week" | "month";
                    /** @description CSV trading account IDs. When omitted, demo accounts are excluded; pass a demo account's ID to include it. */
                    accountIds?: string;
                    /** @description CSV exchange codes (e.g. NASDAQ, ASX) */
                    exchangeCodes?: string;
                    dateFrom?: string;
                    dateTo?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Aggregated time-series points. `currency` is the ISO 4217 code shared by the scoped exchanges (USD when the scope spans several currencies or no exchange filter is given). */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/stocks/quotes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Fetch live quotes for a list of symbols
         * @description Returns the current market price, day change and day change % for each
         *     symbol via FMP, with Yahoo Finance as a fallback. Maximum 50 symbols
         *     per request.
         *     BASE-AUD and BASE-USD crypto symbols use the crypto quote provider with
         *     AUD FX fallback when necessary. Crypto day changes are unavailable (null).
         *     Unresolved symbols are omitted; crypto quotes retain the requested currency.
         */
        get: {
            parameters: {
                query: {
                    /** @description Comma-separated list of symbols (e.g. AAPL,BHP.AX,BTC-USD) */
                    symbols: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Quote data — symbols that could not be resolved are omitted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                change?: number | null;
                                changePercent?: number | null;
                                currency?: string | null;
                                price?: number | null;
                                symbol?: string;
                            }[];
                            success?: boolean;
                        };
                    };
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/stocks/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search stock symbols globally via FMP with Yahoo fallback */
        get: {
            parameters: {
                query: {
                    /** @description Symbol or company name */
                    q: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Matching symbols */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tax-reports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List generated capital gains tax reports for the authenticated user */
        get: {
            parameters: {
                query?: {
                    /** @description Include earlier revisions that have been superseded by a regeneration */
                    includeSuperseded?: "true" | "false";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Report metadata (no PDF bytes/line items), newest financial year first */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tax-reports/generate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Generate (or regenerate) an ATO capital gains tax report
         * @description Computes a capital gains summary for the given Australian financial year across an explicit set of Trading Accounts (a "declaration"), renders a PDF, and stores it as a new revision for that (financial year, account selection) combination. Previous revisions are retained and stay downloadable so an already-lodged report is never overwritten. Regenerating with unchanged content returns the existing current revision instead of creating a new one. Dates in newly generated PDFs use dd/MM/yyyy; regenerating a report with the older date format creates a new revision without modifying the original PDF. New revisions lock selected accounts in stable ID order and recheck ownership and non-demo eligibility before storing account references. A concurrent deletion or report revision change fails explicitly instead of orphaning a new report.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        accountIds: string[];
                        /** @description e.g. 2025 for FY2025-26 (1 Jul 2025 - 30 Jun 2026) */
                        financialYearStartYear: number;
                    };
                };
            };
            responses: {
                /** @description Report generated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid input, no accounts selected, or a selected account is a demo account (demo accounts are never eligible for tax reports) */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Selected account was deleted during report preparation */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account eligibility or current report revision changed during preparation */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tax-reports/position-usage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Map each position to the generated tax reports that already include it
         * @description Derived from each report's stored line items — no denormalised flag is kept. A usage entry is `stale` when the position or any of its transactions was modified after the report was generated, meaning the PDF no longer matches the underlying data and should be regenerated.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Position id keyed map of report usages */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                [key: string]: {
                                    financialYearLabel?: string;
                                    /** Format: date-time */
                                    generatedAt?: string;
                                    reportId?: string;
                                    stale?: boolean;
                                }[];
                            };
                            success?: boolean;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tax-reports/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a single tax report's metadata and per-disposal line items */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Report detail including lineItems */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Report not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Delete a persisted tax report revision
         * @description Deleting the current revision promotes the most recent remaining revision back to current, so the carried-forward loss chain stays intact.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Report deleted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Report not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tax-reports/{id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download the persisted PDF for a tax report */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description PDF file stream */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/pdf": string;
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Report not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/users/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get the authenticated user's profile */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description User profile */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["User"];
                            success?: boolean;
                        };
                    };
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description User not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /**
         * Schedule the authenticated user's account for deletion
         * @description Marks the account deleted and revokes every session immediately. The data is retained until the grace period expires, during which signing in returns 403 with `accountPendingDeletion` and the account can be restored via POST /api/auth/restore. After that a scheduled purge removes the user and all their positions, accounts, snapshots, tax reports and watchlists. An exclusive user lock waits for participating financial writes before marking deletion and revoking sessions together. In-flight writes waiting behind deletion are refused even if their initial authentication check already succeeded.
         */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        currentPassword: string;
                    };
                };
            };
            responses: {
                /** @description Account scheduled for deletion */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                /** Format: date-time */
                                deletedAt?: string;
                                /** Format: date-time */
                                purgeAfter?: string;
                            };
                            success?: boolean;
                        };
                    };
                };
                /** @description Current password incorrect or not authenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        /**
         * Update the authenticated user's profile or password
         * @description Rechecks active user state and any verified password under an exclusive user lock before updating. An in-flight deletion or password change requires authentication again.
         */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": {
                        /** @example USD */
                        baseCurrency?: string;
                        /** @description Required when changing password */
                        currentPassword?: string;
                        name?: string;
                        /** @description Must be at least 8 characters */
                        newPassword?: string;
                    };
                };
            };
            responses: {
                /** @description Profile updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["User"];
                            success?: boolean;
                        };
                    };
                };
                /** @description currentPassword is required when setting a new password */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
                /** @description Current password incorrect or not authenticated */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Error"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/api/watchlists": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List the authenticated user's watchlists */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Watchlists */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Create a new named watchlist */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Watchlist created */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description A watchlist with this name already exists */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/watchlists/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a watchlist and its items */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Watchlist detail */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        /** Delete a watchlist and its items */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deleted */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        /** Rename a watchlist */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        name: string;
                    };
                };
            };
            responses: {
                /** @description Watchlist updated */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        trace?: never;
    };
    "/api/watchlists/{id}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add a stock to a watchlist (creates/reuses the underlying Asset record) */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        assetType?: string;
                        exchangeCode: string;
                        industry?: string;
                        marketCap?: number;
                        name?: string;
                        sector?: string;
                        symbol: string;
                    };
                };
            };
            responses: {
                /** @description Item added */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Validation error */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Watchlist or exchange not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Symbol already in this watchlist */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/watchlists/{id}/items/{itemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Remove a stock from a watchlist */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    itemId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Removed */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Watchlist or item not found */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Error: {
            /** @description Detailed validation errors */
            details?: Record<string, never>[];
            /** @description Stable error category */
            error?: string;
            /** @description Human-readable error detail */
            message?: string;
        };
        OpeningStatement: {
            accountId: string;
            cashBalances: {
                /** @description Explicit opening cash as a decimal string. */
                amount: string;
                currency: string;
            }[];
            /** Format: date-time */
            createdAt: string;
            id: string;
            /** Format: date */
            openingDate: string;
            parcelCount: number;
            sourceFingerprint: string;
            /**
             * @description Inactive statement; never spendable cash or confirmed accounting.
             * @enum {string}
             */
            state: "DRAFT";
            /** @enum {string} */
            timezone: "Australia/Sydney";
            version: number;
        };
        User: {
            /**
             * @description User portfolio base currency (3 letters)
             * @example USD
             */
            baseCurrency?: string;
            /** Format: date-time */
            createdAt?: string;
            /**
             * Format: email
             * @description User email address
             */
            email?: string;
            /** @description Unique identifier */
            id?: string;
            /** @description User full name */
            name?: string;
            /** Format: date-time */
            updatedAt?: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
