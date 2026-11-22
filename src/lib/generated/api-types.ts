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
    "/api/accounts/{id}/cash-operations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read live cash balances, activity and retained audits
         * @description Returns exact ledger-replayed balances and effective-dated activity, the opening boundary, source freshness, unsupported events and attested statement evidence. Transfer audit command summaries include transfer.fromAccountId, transfer.toAccountId and fee (charged to this account only); the shared idempotency key and source reference identify the pair. Transfer principal contributes to account-level external capital and cancels across both endpoints; fees remain costs. Paired operation integrity is checked before returning balances. Active and archived real accounts are read-only here. Evidence is user-attested, not broker-verified; stale or unsupported source history is explicitly flagged.
         */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number;
                };
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Read-only cash replay, effective activity, retained revisions and evidence comparisons. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                /** @enum {string} */
                                accountStatus: "ACTIVE" | "CLOSED";
                                activity: {
                                    auditNumber: number | null;
                                    changes: Record<string, never>[];
                                    /** Format: date */
                                    effectiveDate: string;
                                    idempotencyKey: string;
                                    kind: string;
                                    operationId: string;
                                    /** Format: date-time */
                                    recordedAt: string;
                                    sequence: number;
                                    /** @enum {string} */
                                    sourceOrigin: "MANUAL" | "IMPORT";
                                    sourceReference: string;
                                }[];
                                activityTotal: number;
                                auditNumber: number;
                                auditOperations: {
                                    auditNumber: number;
                                    current: Record<string, never> | null;
                                    incomeReceipt: {
                                        assetId?: string;
                                        assetSymbol?: string;
                                        currency?: string;
                                        /** Format: date */
                                        entitlementDate?: string;
                                        frankedAmount?: string;
                                        frankingCreditAud?: string;
                                        grossAmount?: string;
                                        netAmount?: string;
                                        /** Format: date */
                                        paymentDate?: string;
                                        unfrankedAmount?: string;
                                        withholdingAmount?: string;
                                    } | null;
                                    operationId: string;
                                    original: Record<string, never>;
                                    /** Format: date-time */
                                    recordedAt: string;
                                    revisions: Record<string, never>[];
                                }[];
                                auditTotal: number;
                                /** @enum {string} */
                                cashCompleteness: "COMPLETE" | "INCOMPLETE";
                                /** Format: date-time */
                                checkedAt: string;
                                evidence: Record<string, never>[];
                                /** @enum {string} */
                                evidenceStatus: "MATCHES_REPLAY" | "VARIANCE" | "NO_ATTESTATION";
                                items: {
                                    currency: string;
                                    current: Record<string, never> | null;
                                    expectedRevisionId: string;
                                    /** @enum {string} */
                                    kind: "DEPOSIT" | "WITHDRAWAL";
                                    operationId: string;
                                    original: Record<string, never>;
                                    reinvestment?: {
                                        acquisitionOperationId: string;
                                        incomeOperationId: string;
                                        positionId: string;
                                        request: components["schemas"]["AccountReinvestmentInput"];
                                    } | null;
                                    revisions: Record<string, never>[];
                                    sourceReference: string;
                                }[];
                                ledgerState: string;
                                limit: number;
                                offset: number;
                                openingBoundary: {
                                    /** Format: date */
                                    date: string;
                                    /** @enum {string} */
                                    timezone: "Australia/Sydney";
                                    /** @enum {string} */
                                    type: "END_OF_DAY";
                                };
                                replay: components["schemas"]["AccountTradeResponse"]["data"]["replay"];
                                /** Format: date */
                                reviewedAsOfDate: string;
                                sourceFingerprint: string;
                                sourceFreshness: {
                                    acceptedFingerprint: string;
                                    currentFingerprint: string | null;
                                    /** @enum {string} */
                                    status: "CURRENT" | "STALE" | "NOT_REVALIDATED";
                                };
                                sourceReviewIssues: Record<string, never>[];
                                total: number;
                                unsupportedEvents: Record<string, never>[];
                            };
                            success: boolean;
                        };
                    };
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description No confirmed cash ledger exists */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Record an explicit live deposit or withdrawal
         * @description Posts a cash-only capital flow for an explicitly confirmed active ledger. The operation does not create a trade or auto-balance cash. Dated replay rejects a withdrawal or backdated flow that leaves any point unfunded. No account is activated by this endpoint.
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
                        /** @description Exact positive decimal amount. */
                        amount: string;
                        /** @description Explicit supported ISO currency. */
                        currency: string;
                        /** Format: date */
                        effectiveDate: string;
                        idempotencyKey: string;
                        /** @enum {string} */
                        kind: "DEPOSIT" | "WITHDRAWAL";
                        sequence: number;
                        /** @description User-supplied bank */
                        sourceReference: string;
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of an already committed operation. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Cash-only operation and immutable postings were committed atomically. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid capital flow command. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account has no active confirmed ledger */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Flow would leave a dated cash balance unfunded or history is unsupported. */
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
    "/api/accounts/{id}/cash-operations/{operationId}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correct or reverse a live deposit or withdrawal
         * @description Appends an immutable cash-only revision. Replacements retain operation kind, source reference and currency; reversal is terminal. Dated replay must remain funded.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        expectedAuditNumber: number;
                        expectedRevisionId: string;
                        expectedSourceFingerprint: string;
                        idempotencyKey: string;
                        reason: string;
                        replacement: null | {
                            /** @description Exact positive decimal amount. */
                            amount: string;
                            /** Format: date */
                            effectiveDate: string;
                            sequence: number;
                        };
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of a prior correction/reversal. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: Record<string, never>;
                            success: boolean;
                        };
                    };
                };
                /** @description Immutable correction/reversal and its cash postings were committed. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                created: boolean;
                                operationId: string;
                                replay: components["schemas"]["AccountTradeResponse"]["data"]["replay"];
                                revisionId: string;
                            };
                            success: boolean;
                        };
                    };
                };
                /** @description Invalid correction request. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account or live funding operation not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale audit head */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Corrected or reversed funding would leave a dated balance negative. */
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
    "/api/accounts/{id}/cash-transfers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Atomically transfer same-currency cash between two owned live ledgers
         * @description Both accounts must be active real accounts with confirmed ledgers, current source history and explicit opening cash in this currency. A shared dated transfer debits principal plus sender-paid fee and credits principal only. Principal is external to each account and cancels when both accounts are selected; fees remain costs. No holdings, FX, activation, direct edits or one-sided reversals; corrections use the dedicated paired audit workflow. Same-key retries reuse both operations.
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
                        /** @description Exact positive principal in the same currency at both endpoints. */
                        amount: string;
                        currency: string;
                        destinationSequence: number;
                        /** Format: date */
                        effectiveDate: string;
                        /** @description Exact non-negative sender-paid fee in the principal currency. */
                        fee: string;
                        idempotencyKey: string;
                        sourceReference: string;
                        sourceSequence: number;
                        toAccountId: string;
                    };
                };
            };
            responses: {
                /** @description Identical retry; no new postings. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountCashTransferResponse"];
                    };
                };
                /** @description Both cash operations committed atomically. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountCashTransferResponse"];
                    };
                };
                /** @description Invalid transfer command. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description An owned account was not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Ledger unavailable */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing currency opening or insufficient dated cash. */
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
    "/api/accounts/{id}/cash-transfers/{operationId}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Review both current ledger heads before a paired transfer revision
         * @description Requires an owned outgoing transfer and two active real ledgers with fresh, valid sources. Returns fixed identity, current effective amounts and both review heads. A terminal reversal has current null. Retained archived audits remain accessible via cash-operations instead.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Validated paired review; does not write or activate accounts. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["LiveCashTransferReview"];
                            success: boolean;
                        };
                    };
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned outgoing transfer not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Ledger unavailable */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Atomically correct or terminally reverse both cash-transfer legs
         * @description Preserves both accounts, currency and statement source. Replacement may change principal, sender-paid fee, shared date and independent sequences; null is a terminal reversal. Both review heads must be current, both dated timelines remain funded, and both immutable revision chains commit or roll back together. Old date/sequence slots remain reserved. Same-key retries reuse the pair, even after later activity. No one-sided funding revision, holdings move or FX.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AccountCashTransferCorrectionInput"];
                };
            };
            responses: {
                /** @description Identical paired revision retry; no new postings. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountCashTransferCorrectionResponse"];
                    };
                };
                /** @description Both immutable reversal/replacement revisions committed. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountCashTransferCorrectionResponse"];
                    };
                };
                /** @description Invalid revision or no economic/date/order change. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned outgoing transfer not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale heads */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Either dated account timeline would become unfunded or exceed the supported replay limit. */
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
    "/api/accounts/{id}/fx-conversions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record an explicit same-account currency conversion
         * @description Records an already executed broker conversion, never executes FX or implicitly funds a purchase. Requires an owned active confirmed real ledger, fresh sources and explicit openings in both currencies. Positive exchanged amounts are before separately recorded fees, which may be in either exchanged currency; no third currency. One date/sequence links both currency legs atomically. Full dated funding, immutable history and exact retries are enforced. Principal and fees are not external capital. Revisions use the dedicated audited correction endpoint; no direct edits, holdings changes or account activation.
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
                    "application/json": components["schemas"]["AccountFxConversionInput"];
                };
            };
            responses: {
                /** @description Identical retry; no new postings. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountFxConversionResponse"];
                    };
                };
                /** @description Linked currency postings committed. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountFxConversionResponse"];
                    };
                };
                /** @description Invalid amounts */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unconfirmed/demo/archived/stale ledger */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Missing currency opening */
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
    "/api/accounts/{id}/fx-conversions/{operationId}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Review the current FX revision and live cash audit head
         * @description Requires an owned FX operation and fresh active confirmed real ledger. Returns fixed currency direction/source, current amounts/fees and revision/audit/fingerprint. Terminal reversal has current null. Archived retained audits use cash-operations.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Validated current FX review; no writes or activation. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["LiveFxConversionReview"];
                            success: boolean;
                        };
                    };
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned FX operation not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Archived */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Audited fixed-identity FX correction or terminal reversal
         * @description Changes exchanged amounts, fees, date or sequence, never account, currency pair/direction or source reference. Requires current revision/audit/fingerprint and reason. Atomic inverse/replacement legs restate effective history while preserving all original/replacement slots and funded replay in both currencies. Reversal removes original effects including fees, not a new reverse exchange. Identical retained retries remain valid after later activity; no generic funding revision or activation.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["AccountFxCorrectionInput"];
                };
            };
            responses: {
                /** @description Identical retry; no new postings. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountFxCorrectionResponse"];
                    };
                };
                /** @description Immutable revision committed. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountFxCorrectionResponse"];
                    };
                };
                /** @description Invalid fields */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned FX operation not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale heads/history */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unfunded dated currency timeline or precision/replay limits. */
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
    "/api/accounts/{id}/imported-executions/{eventId}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correct an audited live imported Kraken execution
         * @description Appends an immutable correction overlay while preserving the original Kraken event, execution quantity and existing parcel allocations. Effective date, stable cash sequence, price and fees may change. The correction is supported only when consideration, fees and all allocated parcel transactions use one currency. Cash replay, parcel recomputation, postings and the source fingerprint update commit atomically. Reversal and quantity/allocation changes are not supported.
         */
        post: {
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
                        /** Format: date */
                        effectiveDate: string;
                        expectedRevisionId: string;
                        expectedSourceFingerprint: string;
                        /** @description Exact non-negative total fees in the existing fee currency. */
                        fees: string;
                        idempotencyKey: string;
                        /** @description Exact positive execution price in the existing quote currency. */
                        price: string;
                        reason: string;
                        sequence: number;
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of an already committed correction. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Imported execution */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid correction or a date outside the confirmed review period. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Applied imported execution not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale revision/source */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Correction would leave an unsupported or insufficiently funded ledger. */
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
    "/api/accounts/{id}/income-receipts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record a manual dividend or distribution receipt
         * @description Posts net cash to an active confirmed ledger while retaining gross income, withholding, franked/unfranked amounts, franking credits and the user-supplied statement reference. Only equity and ETF assets already held in the account are supported. Complex AMIT components and automated income are not supported.
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
                        assetId: string;
                        /** @description Explicit supported ISO currency; franking amounts and credits require AUD. */
                        currency: string;
                        /** Format: date */
                        entitlementDate: string;
                        /** @description Gross component classified as franked. */
                        frankedAmount: string;
                        /** @description Non-cash franking credit in AUD. */
                        frankingCreditAud: string;
                        /** @description Exact positive gross distribution amount. */
                        grossAmount: string;
                        idempotencyKey: string;
                        /**
                         * Format: date
                         * @description Effective date for the positive net-cash posting.
                         */
                        paymentDate: string;
                        sequence: number;
                        sourceReference: string;
                        /** @description Gross component classified as unfranked; both components must sum to gross. */
                        unfrankedAmount: string;
                        /** @description Exact non-negative withholding */
                        withholdingAmount: string;
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of an identical income receipt. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountIncomeReceiptResponse"];
                    };
                };
                /** @description Income audit record and net cash posting committed atomically. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountIncomeReceiptResponse"];
                    };
                };
                /** @description Invalid income receipt. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account has no active confirmed ledger */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Asset is not eligible or the dated cash history is unsupported. */
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
    "/api/accounts/{id}/income-receipts/{operationId}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correct or terminally reverse a live income receipt
         * @description Appends an immutable income revision and cash postings. Replacement preserves asset, currency and source reference; reverse and record a new receipt to correct those identity fields. Dated replay must remain funded.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        expectedAuditNumber: number;
                        expectedRevisionId: string;
                        expectedSourceFingerprint: string;
                        idempotencyKey: string;
                        reason: string;
                        replacement: null | {
                            /** Format: date */
                            entitlementDate: string;
                            frankedAmount: string;
                            frankingCreditAud: string;
                            grossAmount: string;
                            /** Format: date */
                            paymentDate: string;
                            sequence: number;
                            unfrankedAmount: string;
                            withholdingAmount: string;
                        };
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of a prior correction/reversal. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Immutable correction/reversal and cash postings committed. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid correction request. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account or live income receipt not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale audit head */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Corrected or reversed income would leave a dated balance negative. */
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
         * @description Read-only end-of-day Australia/Sydney reconciliation. Opening and current inventory replay validated retained split effects without changing trade cash. Split actions and effects are included in source fingerprints. Missing or inconsistent retained effects reject the preview rather than returning partial inventory. It cannot confirm or enable accounting; retained splits remain a blocking issue for opening confirmation and cash-completeness certification pending broader historical protections and release review. Missing funding is never invented. Limited to 5000 parcels, 500 import batches, 50000 transactions, 10000 relevant import events, 500 split actions and 50000 split effects; exceeding any limit returns 422.
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
         * List opening statement revisions newest first
         * @description Returns up to 20 inactive drafts or confirmed statements with explicit cash balances, parcel counts, operation counts and confirmation audit metadata. Saved snapshots are not current account valuations. Closed accounts retain access; drafts are removed with account/user deletion.
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
                /** @description Opening statement revision page. */
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
    "/api/accounts/{id}/opening-statements/{statementId}/cash-evidence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record an immutable, user-attested statement cash snapshot
         * @description Requires every tracked currency and a reasoned decision for each exact cash difference. Decisions record review only; they do not adjust cash or clear a variance. A later dated deposit/withdrawal must make replay match. Not external verification or accounting activation.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: date */
                        asOfDate: string;
                        /** @enum {boolean} */
                        attested: true;
                        cashBalances: {
                            amount: string;
                            currency: string;
                        }[];
                        decisions: {
                            currency: string;
                            note: string;
                            /** @enum {string} */
                            reason: "UNRECORDED_OPERATION" | "TIMING_DIFFERENCE" | "SOURCE_CORRECTION_REQUIRED" | "OTHER";
                        }[];
                        idempotencyKey: string;
                        /** @description Statement number or user-entered reference; never an uploaded document. */
                        reference: string;
                        /** @description Bank/broker statement issuer. */
                        source: string;
                    };
                };
            };
            responses: {
                /** @description Immutable evidence snapshot and exact dated cash replay comparison. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid evidence */
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
                /** @description Account or opening statement not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Idempotency conflict or stale opening source. */
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
    "/api/accounts/{id}/opening-statements/{statementId}/cash-evidence/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Preview exact statement-date cash variances without saving evidence
         * @description Calculates replay and signed per-currency differences. It creates no evidence, decisions, postings or other records. Statement balances remain user-entered and attested.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": Record<string, never>;
                };
            };
            responses: {
                /** @description Exact statement-date cash replay and variances. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid evidence or incomplete currency coverage. */
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
                /** @description Account or statement not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Replay exceeds supported limits. */
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
    "/api/accounts/{id}/opening-statements/{statementId}/cash-operations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Stage a sourced dated deposit or withdrawal in an inactive draft
         * @description A cash operation must describe an actual external cash movement and include an explicit effective date, stable sequence and source reference. It is not a balancing adjustment. Historical replay rejects spending before recorded funding. Draft postings never affect live cash or holdings.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @description Positive exact decimal amount. */
                        amount: string;
                        currency: string;
                        /** Format: date */
                        effectiveDate: string;
                        idempotencyKey: string;
                        /** @enum {string} */
                        kind: "DEPOSIT" | "WITHDRAWAL";
                        sequence: number;
                        /** @description Bank/broker transfer reference. */
                        sourceReference: string;
                    };
                };
            };
            responses: {
                /** @description Dated inactive cash operation and replay. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid cash operation. */
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
                /** @description Account or opening statement not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Duplicate source */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Insufficient dated cash or replay limit exceeded. */
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
    "/api/accounts/{id}/opening-statements/{statementId}/cash-operations/{operationId}/acquisition-corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correct a recorded manual acquisition and its draft cash atomically
         * @description Changes the live manual long BUY date, quantity, price and fees, recomputes parcel cost basis, remaining inventory and realized results, and appends an immutable cash revision with before/after source snapshots and fingerprint continuation. Sale quantities and allocations never change. The parcel must have exactly one BUY, cover all sales and precede their dates. Same-day sales require effective draft cash ordered after the acquisition. Imported parcels and broker-linked sales are excluded. Account, instrument, currency and source identity cannot change. The acquisition must stay after opening and within the original observation date. Quantity is an exact decimal string with at most 12 fractional digits, at most 9007199254740991, and must round-trip through the existing Float storage without changing decimal value. Gross consideration is quantity times price rounded half-up to 2 decimal places. Same-Sydney-date edits retain timestamps; changed dates use 01:00 UTC. The original opening and statement evidence remain unchanged; unrelated drafts and tax reports can become stale. No spendable cash or accounting activation is enabled.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: date */
                        effectiveDate: string;
                        expectedRevisionId: string;
                        expectedSourceFingerprint: string;
                        /** @description Non-negative exact decimal with at most 10 integer and 8 fractional digits */
                        fees: string;
                        idempotencyKey: string;
                        /** @description Positive exact decimal with at most 12 integer and 12 fractional digits */
                        price: string;
                        /** @description Positive representable decimal quantity covering all existing sales */
                        quantity: string;
                        reason: string;
                        sequence: number;
                    };
                };
            };
            responses: {
                /** @description Draft operationId */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid fields */
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
                /** @description Owned manual acquisition */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale source/head */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Dated funding deficit */
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
    "/api/accounts/{id}/opening-statements/{statementId}/cash-operations/{operationId}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correct or reverse an inactive manual deposit or withdrawal
         * @description Appends immutable reversal/replacement history with a required audit reason. Currency, kind and source identity are retained from the original entry. Supply replacement null for a terminal reversal. The expected revision prevents lost updates; identical retries return the saved correction. Dated replay rejects downstream funding gaps. No live balances or holdings change.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @description Current revision ID from reconciliation */
                        expectedRevisionId: string;
                        idempotencyKey: string;
                        reason: string;
                        replacement: {
                            /** @description Positive exact decimal amount in the original currency. */
                            amount: string;
                            /** Format: date */
                            effectiveDate: string;
                            sequence: number;
                        } | null;
                    };
                };
            };
            responses: {
                /** @description Inactive correction with operationId */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid correction fields. */
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
                /** @description Account */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale revision/source */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Historical funding deficit or replay limit exceeded. */
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
    "/api/accounts/{id}/opening-statements/{statementId}/cash-operations/{operationId}/sale-corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correct a recorded manual sale and its draft cash atomically
         * @description Explicitly changes the live manual SELL date, price and fees, recomputes parcel totals, and appends exact cash reversal/replacement postings with immutable before/after trade snapshots and source fingerprint continuation. Quantity, parcel, instrument, currency and source identity cannot change. Imported sources and cash-only reversal are unsupported. Gross consideration is quantity times price rounded half-up to the transaction's two decimal places. A same-Sydney-date correction preserves the original timestamp; changing date records the new calendar date at 01:00 UTC. Dates must remain after opening, on/after acquisition and within the original observation date. Same-day sales must follow effective acquisition cash in explicit sequence order. The original opening snapshot and statement evidence never change; other drafts become stale. Expected revision/source and idempotency checks serialize edits. This changes live trade history and can make existing tax reports stale, but does not activate accounting or post spendable cash.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: date */
                        effectiveDate: string;
                        expectedRevisionId: string;
                        expectedSourceFingerprint: string;
                        /** @description Non-negative exact decimal with at most 10 integer and 8 fractional digits */
                        fees: string;
                        idempotencyKey: string;
                        /** @description Positive exact decimal with at most 12 integer and 12 fractional digits */
                        price: string;
                        reason: string;
                        sequence: number;
                    };
                };
            };
            responses: {
                /** @description Draft operationId */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unsupported fields */
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
                /** @description Owned manual sale */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale source/head */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Dated funding deficit */
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
    "/api/accounts/{id}/opening-statements/{statementId}/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm one reviewed opening statement and atomically enable its cash ledger
         * @description Per-account and retry-safe. Requires the latest clean draft, matching source records at the reviewed observation date, issue-free supported inventory, no post-boundary trades, funded replay, exact latest user-attested cash evidence and explicit acknowledgements. Saved activity on the selected draft blocks confirmation; activity on other inactive drafts is retained and explicitly excluded, never posted or promoted. Confirmation creates no valuation or performance return. This endpoint enables only the selected account and is never called implicitly.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        acknowledgements: {
                            /** @enum {boolean} */
                            cashEvidenceUserAttested: true;
                            /** @enum {boolean} */
                            openingBalancesReviewed: true;
                            /** @enum {boolean} */
                            priorDraftActivityExcluded: true;
                            /** @enum {boolean} */
                            returnsUnavailableWithoutValuations: true;
                        };
                        expectedSourceFingerprint: string;
                        idempotencyKey: string;
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of the original confirmation. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["OpeningConfirmationResult"];
                            success: boolean;
                        };
                    };
                };
                /** @description Opening statement confirmation and active ledger committed atomically. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: components["schemas"]["OpeningConfirmationResult"];
                            success: boolean;
                        };
                    };
                };
                /** @description Invalid confirmation command or incomplete acknowledgement. */
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
                /** @description Account or opening statement not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Source/evidence drift */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Reconciliation exceeds supported confirmation limits. */
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
    "/api/accounts/{id}/opening-statements/{statementId}/import-events/{eventId}/cash-operation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Stage cash from an applied Kraken execution in an inactive draft
         * @description Uses execution amounts and transaction links from the persisted applied import event; callers can supply only its stable sequence for the execution date. The event must belong to this account and match its recorded transaction links. Draft postings never affect live cash or holdings.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                    eventId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** @description Explicit stable order among operations on the same date; no ordering is inferred. */
                        sequence: number;
                    };
                };
            };
            responses: {
                /** @description Imported execution cash staged in the inactive draft with replay. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid sequence or unsupported execution currency. */
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
                /** @description Account */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Duplicate source */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Insufficient dated cash or replay limit exceeded. */
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
    "/api/accounts/{id}/opening-statements/{statementId}/imported-cash-operations/{operationId}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correct the stable intraday sequence of staged Kraken execution cash
         * @description Appends an audited sequence-only revision after revalidating the persisted applied execution and all transaction links under the account lock. Date, amounts, fees, source and transaction identities cannot change. Cash-only reversals are not supported. Expected revision and idempotency protect concurrent edits and retries. Full dated replay must remain funded. No live holdings or balances change.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        expectedRevisionId: string;
                        idempotencyKey: string;
                        reason: string;
                        sequence: number;
                    };
                };
            };
            responses: {
                /** @description Inactive correction with operationId */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid sequence or unsupported correction fields. */
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
                /** @description Owned account */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Changed execution/source/revision */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Dated funding deficit or replay limit exceeded. */
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
    "/api/accounts/{id}/opening-statements/{statementId}/reconciliation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read-only reconciliation report for an inactive opening draft
         * @description Compares reviewed opening inventory, current live source records, proposed draft cash/trades, recorded cash evidence, linked execution identities and manual/Kraken cash-staging candidates. Statement balances are user-attested, not independently verified. This endpoint never activates accounting or changes financial records. Reconciliation is bounded to 10000 imported executions and 50000 transactions.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Read-only draft reconciliation including cash evidence/variances, source savedFingerprint/acceptedFingerprint/currentFingerprint/correctionCount/changed, confirmationReview (eligible, blockers, excludedDraftActivity with statementId/version/operationCount), cash-operation currentRevisionId/capital cash/revisions (revisionId, reason, replacement boolean, nullable executionAudit containing number, previousFingerprint, nextFingerprint, reviewed input and before/after transaction snapshots; acquisition audits have kind BUY and input quantity, historical sale audits are untagged), effective or reversed sources, imported execution eligibility with duplicate transaction-link detection and cashManualExecutions (transactionId, positionId, kind, quantity, effectiveDate, occurredAt, currency, price, grossValue, fee, stageable, reason, operationId). Audit snapshots include transactionId, positionId, ISO date, quantity, price, totalValue, fees and currency. Manual eligibility excludes broker-linked allocations, imported/short parcels, unsupported money, boundary/future dates, stale snapshots, unavailable accounts and incompatible opening-sale proposals. */
                200: {
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
                /** @description Account or opening statement not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stored draft audit history is inconsistent. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Reconciliation exceeds bounded processing limits */
                422: {
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
    "/api/accounts/{id}/opening-statements/{statementId}/transactions/{transactionId}/cash-operation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Stage cash from a recorded manual BUY or SELL in an inactive draft
         * @description Accepts only an explicit intraday sequence. Date, currency, gross amount and fees come from the owned manual long parcel transaction and are revalidated under the account lock. Broker-linked allocations and imported parcels require their source-aware workflow. No live trades, balances or tax records change.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    statementId: string;
                    transactionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        sequence: number;
                    };
                };
            };
            responses: {
                /** @description Draft operationId */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid sequence or unsupported execution values. */
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
                /** @description Owned manual transaction or opening statement not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Changed source */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Dated funding deficit */
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
    "/api/accounts/{id}/reinvestments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record statement-supported dividend reinvestment atomically
         * @description Creates exactly one equity/ETF income receipt and a new BUY parcel in the same account/currency. Statement-confirmed entitlement and tax figures are authoritative; eligible historical holdings are required. Exact net income must equal acquisition consideration plus fees plus an explicit account-paid residual; issuer-held credits, extra funding, existing-receipt relinking and AMIT components are unsupported. Acquisition follows income in date/sequence order and, with validated split history, must follow the split date. Paired immutable links and full funded replay protect both records. Independent income revisions, acquisition corrections/voids and direct deletion are blocked; use the dedicated paired revision workflow. No activation or external capital is created.
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
                    "application/json": components["schemas"]["AccountReinvestmentInput"];
                };
            };
            responses: {
                /** @description Identical retained retry; no new records. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountReinvestmentResponse"];
                    };
                };
                /** @description Income, new parcel and immutable linked postings committed. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountReinvestmentResponse"];
                    };
                };
                /** @description Invalid fields */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unconfirmed */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Ineligible asset */
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
    "/api/accounts/{id}/reinvestments/{operationId}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Review a paired reinvestment and current account audit head
         * @description Requires an owned fresh active real ledger. Either linked operation ID resolves both current revision heads, fixed statement identity and effective-sale restriction. With validated split history, entitlement uses split-adjusted holdings and acquisition must follow the split date. Terminal reversal returns current null. Archived retained audits use cash-operations.
         */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Validated current paired review. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: components["schemas"]["LiveReinvestmentReview"];
                            success?: boolean;
                        };
                    };
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned reinvestment not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unavailable */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /**
         * Correct or terminally reverse both reinvestment effects atomically
         * @description Fixed account, asset, currency and statement reference. Requires both current revision heads, audit number, source fingerprint and reason. No effective SELL may remain on the new parcel. Corrections update statement tax figures and acquisition/date/order/residual together, retain all slots and require funded replay; reversal removes the effective income and parcel without a disposal. Moving the acquisition later or reversing it must preserve historical holdings for other active income and reinvestment entitlements; review is limited to 500 distinct date/parcel checks. With validated split history, entitlement uses split-adjusted holdings. A pre-split correction must preserve the acquisition date and quantity; reverse dependent splits before changing either or reversing the reinvestment. Issuer-held credits and one-sided changes remain blocked. Exact retained retries survive later activity.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    operationId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": components["schemas"]["ReinvestmentCorrectionInput"];
                };
            };
            responses: {
                /** @description Identical retained retry. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReinvestmentCorrectionResponse"];
                    };
                };
                /** @description Paired immutable revisions committed. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReinvestmentCorrectionResponse"];
                    };
                };
                /** @description Invalid */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned reinvestment not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Effective sales, dependent split or income entitlement, stale heads, terminal state, reserved slots or unfunded replay. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unsupported entitlement or history bounds. */
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
    "/api/accounts/{id}/splits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read retained stock-split history for an account
         * @description Returns bounded action metadata and terminal reversals. Raw parcel effects are not exposed; reversals remain visible as retained audit history.
         */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number;
                };
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Retained paginated split history. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid pagination. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account not found. */
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
         * Post a statement-supported stock split or consolidation
         * @description Requires an owned fresh active real ledger and complete split-aware account source replay. Applies an exact unit ratio to eligible long equity/ETF parcels without changing acquisition dates or cash. Later sales, ambiguous same-day events, missing effects, unsupported imports and stale source heads fail closed. Exact retries retain the original action.
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
                        assetId: string;
                        /** Format: date */
                        effectiveDate: string;
                        idempotencyKey: string;
                        newUnits: string;
                        oldUnits: string;
                        sourceReference: string;
                        /** @enum {boolean} */
                        statementConfirmed: true;
                    };
                };
            };
            responses: {
                /** @description Identical retained retry. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Split action and parcel effects committed. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid ratio */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account or asset not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale source */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Split history or parcel bounds exceeded. */
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
    "/api/accounts/{id}/splits/{actionId}/reversal": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Terminally reverse a retained stock split
         * @description Requires the active account audit head and no dependent split effects, sales or reinvestments. Reversal restores retained parcel quantities and source history atomically; it is terminal and does not support replacement payloads.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    actionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        actionId: string;
                        expectedAuditNumber: number;
                        expectedSourceFingerprint: string;
                        idempotencyKey: string;
                        reason: string;
                        /** @enum {boolean} */
                        reversalConfirmed: true;
                    };
                };
            };
            responses: {
                /** @description Identical retained retry. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Terminal reversal committed. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid reversal payload or confirmation. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Action or account not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Dependent sales/actions/reinvestments */
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
    "/api/accounts/{id}/trade-capability": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Resolve the server-owned trade-write capability for an account
         * @description Distinguishes active confirmed ledgers from legacy, demo, archived and blocked accounts. Validated retained split history supports coordinated manual BUY/SELL; post-split trade corrections/voids; and pre-split price/fee/cash-sequence corrections only when original date and quantity are preserved. Pre-split voids and inventory-changing corrections remain blocked. Audited cash-only operations, statement-income receipts/corrections and paired dividend-reinvestment workflows are also supported; reinvestment entitlement uses split-adjusted holdings and acquisition must follow the split date. Imports, legacy financial mutations, moves and deletion remain blocked. Cash-completeness certification and opening confirmation remain blocked pending broader historical protections and release review. This read never activates an account.
         */
        get: {
            parameters: {
                query: {
                    effectiveDate: string;
                };
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Capability and available same-day cash sequence. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                accountId: string;
                                /** Format: date */
                                effectiveDate: string;
                                /** @enum {string} */
                                mode: "LIVE_LEDGER" | "LEGACY" | "DEMO" | "ARCHIVED" | "BLOCKED";
                                nextSequence: number | null;
                                /** Format: date */
                                openingDate: string | null;
                                reason: string | null;
                            };
                            success: boolean;
                        };
                    };
                };
                /** @description Invalid effective date. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Ledger state or audited history is inconsistent. */
                409: {
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
    "/api/accounts/{id}/trades": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Atomically post a BUY or SELL with account cash
         * @description Available only to accounts with an explicitly confirmed opening statement and active cash ledger. SELLs must preserve positive historical holdings for active income and reinvestment entitlements on or after the sale date; review is limited to 500 distinct date/parcel checks. Legacy account posting remains unchanged; no account is activated by this endpoint.
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
                        /** @description Existing asset ID for BUY; alternatively provide symbol and exchangeCode. */
                        assetId?: string;
                        assetName?: string;
                        /** @enum {string} */
                        assetType?: "EQUITY" | "ETF" | "CRYPTO";
                        /** @enum {string} */
                        closeReason?: "STOP_LOSS" | "TARGET" | "MANUAL" | "OTHER";
                        /** Format: date */
                        effectiveDate: string;
                        /** @description BUY exchange code when resolving an asset. */
                        exchangeCode?: string;
                        /** @description Exact non-negative decimal fee. */
                        fees: string;
                        idempotencyKey: string;
                        industry?: string;
                        /** @enum {string} */
                        kind: "BUY" | "SELL";
                        /** @description SELL notes. */
                        notes?: string;
                        openReason?: string;
                        /** @description Required for SELL only. */
                        positionId?: string;
                        /** @description Exact positive decimal price. */
                        price: string;
                        /** @description Exact positive decimal quantity. */
                        quantity: string;
                        sequence: number;
                        stopLossPrice?: string | null;
                        /** @description BUY instrument symbol when resolving an asset. */
                        symbol?: string;
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of an already committed trade. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountTradeResponse"];
                    };
                };
                /** @description Trade, cash postings and source audit were committed atomically. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountTradeResponse"];
                    };
                };
                /** @description Invalid trade command. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account is not ledger-enabled, source history drifted, cash sequence conflicts, or a sale would invalidate an income entitlement. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Insufficient cash, unsupported account history, or entitlement review limit exceeded. */
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
    "/api/accounts/{id}/trades/voids": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Read retained manual trade void audits for a confirmed real ledger
         * @description Read-only audit access remains available on archived accounts. The stored operation, revision, posting and void-marker chain is validated; this is not a current cash reconciliation or source-freshness assertion.
         */
        get: {
            parameters: {
                query?: {
                    limit?: number;
                    offset?: number;
                };
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Retained voids sorted by void timestamp descending. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                items: {
                                    before: {
                                        currency: string;
                                        /** Format: date-time */
                                        date: string;
                                        fees: string;
                                        positionId: string;
                                        price: string;
                                        quantity: string;
                                        totalValue: string;
                                        transactionId: string;
                                    };
                                    /** @enum {string} */
                                    kind: "BUY" | "SELL";
                                    operationId: string;
                                    positionId: string;
                                    reason: string;
                                    revisionId: string;
                                    transactionId: string;
                                    /** Format: date-time */
                                    voidedAt: string;
                                }[];
                                limit: number;
                                offset: number;
                                total: number;
                            };
                            success: boolean;
                        };
                    };
                };
                /** @description Invalid pagination. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned account not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Account is not ledger-enabled or retained audit history is inconsistent. */
                409: {
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
    "/api/accounts/{id}/trades/{transactionId}/acquisition-corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correct an audited live manual acquisition
         * @description Appends an immutable BUY revision and reversal/replacement cash postings. Date, stable cash sequence, exact bought quantity, price and fees may change. All existing sales are preserved; the corrected acquisition must cover them and precede their dates and cash ordering. A later acquisition date or reduced quantity must preserve positive historical holdings for active income and reinvestment entitlements; review is limited to 500 distinct date/parcel checks. Imported executions, moves and reversal remain unsupported. With retained split history, a pre-split correction may change price, fees or cash sequence only when acquisition date and quantity are unchanged. A date/quantity-changing correction requires both original and replacement dates to be strictly after the latest active split for the asset. No account is activated.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    transactionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: date */
                        effectiveDate: string;
                        expectedRevisionId: string;
                        expectedSourceFingerprint: string;
                        /** @description Exact non-negative decimal purchase fee. */
                        fees: string;
                        idempotencyKey: string;
                        /** @description Exact positive decimal purchase price. */
                        price: string;
                        /** @description Exact positive bought quantity */
                        quantity: string;
                        reason: string;
                        sequence: number;
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of an already committed correction. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LiveExecutionCorrectionResponse"];
                    };
                };
                /** @description Acquisition, parcel results, audit revision and cash postings committed atomically. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LiveExecutionCorrectionResponse"];
                    };
                };
                /** @description Invalid correction or unrepresentable amount or quantity. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned live manual acquisition not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale revision, source drift, reserved sequence, imported allocation, dependent income entitlement or invalid acquisition/sale ordering. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Correction would leave an unsupported or insufficiently funded ledger, or exceed the entitlement review limit. */
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
    "/api/accounts/{id}/trades/{transactionId}/corrections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Correct an audited live manual sale
         * @description Appends an immutable correction revision for a cash-linked manual SELL. Only date, stable cash sequence, price and fees may change; quantity, source identity and imported executions are immutable. Moving the sale earlier must preserve positive historical holdings for active income and reinvestment entitlements in the affected period; review is limited to 500 distinct date/parcel checks. With retained split history, a pre-split correction may change price, fees or cash sequence only when the execution date is unchanged. A date change requires both original and replacement dates to be strictly after the latest active split for the asset. Reversal is not supported.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    transactionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        /** Format: date */
                        effectiveDate: string;
                        expectedRevisionId: string;
                        expectedSourceFingerprint: string;
                        /** @description Exact non-negative decimal fee. */
                        fees: string;
                        idempotencyKey: string;
                        /** @description Exact positive decimal sale price. */
                        price: string;
                        reason: string;
                        sequence: number;
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of an already committed correction. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Correction, audit revision and cash postings were committed atomically. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Invalid correction. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Live manual sale not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale revision, source drift, reserved sequence, dependent income entitlement or inconsistent cash history. */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Correction would leave an unsupported or insufficiently funded cash ledger, or exceed the entitlement review limit. */
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
    "/api/accounts/{id}/trades/{transactionId}/voids": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Void an audited live manual trade without deleting its records
         * @description SELL voids restore parcel inventory and remove proceeds from cash replay. BUY voids require no effective sales and must preserve positive historical holdings for active income and reinvestment entitlements; a reinvestment's own parcel cannot establish its eligibility. Income entitlement review is limited to 500 distinct date/parcel checks. Only active real ledgers and manual parcels are supported. With retained split history, the trade must be strictly after the latest active split for its asset. The terminal revision retains original trades, postings and date/sequence reservations. No account is activated.
         */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    transactionId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/json": {
                        expectedRevisionId: string;
                        expectedSourceFingerprint: string;
                        idempotencyKey: string;
                        reason: string;
                    };
                };
            };
            responses: {
                /** @description Idempotent retry of an already committed void. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LiveExecutionCorrectionResponse"];
                    };
                };
                /** @description Trade void, parcel update and cash reversal committed atomically. */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LiveExecutionCorrectionResponse"];
                    };
                };
                /** @description Invalid void request. */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Unauthorized. */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Owned live manual trade not found. */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Stale source/revision */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Removing the trade would leave insufficient cash */
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
                /** @description Blocking issues, chronology violation, discarded batch, concurrent event/holdings changes, or retained split history blocks new financial import steps pending split-aware accounting */
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
         * @description Upserts a synthetic daily legacy snapshot row under shared-user and owned-account locks. Rereads holdings after locking; a deleted user or account cannot receive a late snapshot. Split-affected open parcels use validated remaining acquisition cost; other legacy totals and daily date semantics are unchanged. Inactive draft cash is excluded. Snapshots are not sourced or verified valuations.
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
                /** @description Split history cannot be validated; no snapshot is saved */
                500: {
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
        /**
         * List effective positions for the authenticated user
         * @description Voided acquisitions and voided transactions are excluded. Original records remain available in retained manual trade void audits.
         */
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
                /** @description Paginated list of positions. Split-bearing parcels also include `splitAdjustedInventory` with decimal-string remaining quantity, cost basis, remaining acquisition fees and average unit cost (null when fully disposed). Original acquisition price and fee fields are not rewritten. Open long parcels with a stop loss and retained split history include `stopLossReviewRequired: true`; automatic stop-loss monitoring is unavailable until split-aware review is supported. Positions with retained relevant split history include `priceHistoryReviewRequired: true`; their drawdown and run-up values are unavailable until split-aware history is supported. Eligible live manual acquisitions include acquisitionCorrection metadata with transactionId, operationId, expectedRevisionId, expectedSourceFingerprint, effectiveDate, sequence and exact decimal-string quantity (total bought units), price and fees. Eligible live imported Kraken BUY executions also include importedExecutionCorrection metadata containing eventId, transactionId, operationId, expectedRevisionId, expectedSourceFingerprint, effectiveDate, sequence, price, fees and currency. Demo and legacy executions do not receive correction controls. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                /** @description Drawdown and run-up values are unavailable due to retained split history */
                                priceHistoryReviewRequired?: boolean;
                                /** @description Stop-loss monitoring is unavailable due to retained split history */
                                stopLossReviewRequired?: boolean;
                            }[];
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
                /** @description Existing asset has an incompatible classification, trading account must be reopened, or retained split history blocks financial writes pending split-aware accounting */
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
         * @description Without `accountId`, close events from demo accounts are excluded. Pass a demo account's ID to list its history explicitly. Voided sales and acquisitions are excluded; retained void audits are available separately on the account.
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
                /** @description Paginated SELL transactions with position and asset context. Each event carries `closeReason` (STOP_LOSS | TARGET | MANUAL | OTHER, or null when unknown). Eligible live manual sales include `cashCorrection` metadata for the audited correction endpoint. Eligible live imported Kraken SELLs include `importedExecutionCorrection` with eventId, transactionId, operationId, expectedRevisionId, expectedSourceFingerprint, effectiveDate, sequence, price, fees and currency. Eligible live manual BUYs include `acquisitionCorrection`, also for fully closed parcels. Eligible live imported Kraken BUYs include `importedAcquisitionCorrection` with the same imported-execution metadata, also for fully closed parcels. Demo and legacy executions do not receive correction controls. Events affected by retained split history include validated `splitAdjustedSale` costBasis and buyFees decimal strings, allocated from the original acquisition; entryPrice remains the historical acquisition price. Inconsistent split history fails closed. Positions with retained relevant split history have null drawdown and run-up values and include `position.priceHistoryReviewRequired: true`. */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data?: {
                                position?: {
                                    /** @description Drawdown and run-up values are unavailable due to retained split history */
                                    priceHistoryReviewRequired?: boolean;
                                };
                                splitAdjustedSale?: {
                                    /** @description Allocated original buy fees */
                                    buyFees: string;
                                    /** @description Allocated original acquisition cost including buy fees */
                                    costBasis: string;
                                };
                            }[];
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
                /** @description Split history cannot be validated */
                500: {
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
         * @description Updates the sale and parcel totals atomically under an owned-account and parcel lock. Does not activate or spend inactive draft cash. Concurrent parcel moves require reload. Imported broker-linked execution values are immutable here. Financial changes to cash-linked manual trades require the audited account trade correction endpoint; this ordinary editor returns 409 instead. Notes and close reason remain editable; unchanged financial values are not rewritten. Metadata-only changes do not recompute or update the parcel.
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
                /** @description Concurrent move, imported execution change, financial edit of a cash-linked trade, or retained split history blocking financial changes (notes remain editable) */
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
         * @description Deletes under owned-account and parcel locks. Inactive opening and cash draft snapshot references are retained; source changes prevent further draft appends. Imported parcels, parcels containing broker-linked allocations and parcels with any cash-linked transaction cannot be deleted here. Dedicated coordinated correction or source-aware adjustment is required; reversing cash does not release its identity.
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
                /** @description Concurrent move, imported execution records, durable draft cash links, or retained split history blocks deletion pending split-aware accounting */
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
         * @description Crypto symbols must match the venue quote currency. Changing a Kraken instrument validates its market; unchanged historical instruments remain editable. Acquisition edits commit the BUY and recomputed parcel results together. Bought units cannot be reduced below already-sold units. Account moves lock both accounts in stable order and recheck the demo/real boundary. Inactive draft cash is not spent or activated. An edit or move that would leave open holdings in a closed account returns 409; reopen the account first. Corrections and moves of fully closed history remain allowed. Imported acquisition values and source identities cannot be changed here. Financial edits, instrument/account changes and deletion of cash-linked trades require coordinated correction and return 409 here, including for reversed cash operations. The opening reconciliation workflow supports manual acquisition and sale corrections, not deletion or moves. Notes and metadata remain editable; resubmitting unchanged financial values is allowed. Source-neutral metadata preserves the position's updatedAt for accounting fingerprint compatibility; financial changes continue to update it.
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
                /** @description Incompatible asset, concurrent account move, parcel does not have exactly one BUY, open holdings require account reopening, or retained split history blocks financial changes, moves, and drawdown/run-up updates (notes remain editable) */
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
         * @description For an open long position with a stop loss that is not already flagged, decides whether the stop has been reached and, if so, persists stopLossHitAt so the flag survives the price recovering. If currentPrice is supplied and at or below the stop, the stop is flagged immediately. Otherwise daily lows are scanned from the time the stop was last set (or the open date, if never changed) to today; the first day whose low reached the stop becomes stopLossHitAt (day-granular). Editing the stop loss price clears the flag. Already-flagged, closed, short, or stop-less positions are returned unchanged. Saving rechecks the stop and holding inputs under user/account/parcel locks; concurrent changes return 409 rather than persisting a stale hit. Split-affected stop monitoring is unavailable and returns 409, including for previously flagged stops and retained reversed splits.
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
                /** @description Stop or holding changed during calculation, or split-affected stop monitoring requires review */
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
                /** @description Position moved accounts concurrently, or retained split history blocks sales pending split-aware accounting */
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
         * @description Fetches daily OHLC history from the position's open date to today (or to the close date for closed positions, for the run-up), finds the lowest intraday low and persists it as maxDrawdownPercent, and finds the highest intraday high and persists it as maxRunUpPercent (peak unrealized gain vs entry price). Returns the new values (or null if history is unavailable / no drawdown / no run-up). Saving takes user/account/parcel locks and rejects changed calculation inputs with 409. Retained split history blocks this calculation, including after reversal.
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
                /** @description Position changed during calculation or has retained split history */
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
    "/api/positions/{id}/stop-loss-review": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm a manually reviewed split-affected stop loss
         * @description Records the user's confirmed stop price and restarts hit tracking from the review time. It does not adjust the saved price by the split ratio.
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
                        /** @enum {boolean} */
                        reviewConfirmed: true;
                        stopLossPrice: number;
                    };
                };
            };
            responses: {
                /** @description Stop-loss review recorded */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": {
                            data: {
                                stopLossPrice: number;
                                /** Format: date-time */
                                stopLossSetAt: string;
                            };
                            success: boolean;
                        };
                    };
                };
                /** @description Invalid stop-loss price or missing confirmation */
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
                /** @description Position is not an open long parcel with an active stop and retained split history, or it changed during review */
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
                    /** @description CSV position statuses. Defaults to OPEN,PARTIAL when `metric=marketValue` (closed positions hold nothing); all statuses otherwise. For marketValue, acquisition cost is allocated to the quantity still held, including validated split history. */
                    status?: "OPEN" | "PARTIAL" | "CLOSED";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Grouped rows with weights. Market value is an estimate based on remaining acquisition cost plus stored unrealized P&L, not a live valuation. Rows for `by=exchange` also include the exchange's ISO 4217 `currency`. */
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
                /** @description Split history cannot be validated for the market-value estimate */
                500: {
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
         * @description Computes a capital gains summary for the given Australian financial year across an explicit set of Trading Accounts (a "declaration"), renders a PDF, and stores it as a new revision for that (financial year, account selection) combination. Previous revisions are retained and stay downloadable so an already-lodged report is never overwritten. Regenerating with unchanged content returns the existing current revision instead of creating a new one. Dates in newly generated PDFs use dd/MM/yyyy; regenerating a report with the older date format creates a new revision without modifying the original PDF. New revisions lock selected accounts in stable ID order and recheck ownership and non-demo eligibility before storing account references. A concurrent deletion or report revision change fails explicitly instead of orphaning a new report. Report inputs are rechecked under those locks before returning or saving a revision; changed holdings, disposals or loss carry-forward require a retry.
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
                /** @description Account eligibility, report inputs or current report revision changed during preparation */
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
         * @description Deleting the current revision promotes the most recent remaining revision back to current, so the carried-forward loss chain stays intact. Deletion is serialized with report generation and rereads the revision before promotion.
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
        AccountCashTransferCorrectionInput: {
            destinationHead: components["schemas"]["TransferRevisionHead"];
            idempotencyKey: string;
            reason: string;
            replacement: components["schemas"]["TransferReplacement"];
            sourceHead: components["schemas"]["TransferRevisionHead"];
        };
        AccountCashTransferCorrectionResponse: {
            data: {
                created: boolean;
                destinationOperationId: string;
                destinationReplay: components["schemas"]["DraftCashReplay"];
                destinationRevisionId: string;
                sourceOperationId: string;
                sourceReplay: components["schemas"]["DraftCashReplay"];
                sourceRevisionId: string;
            };
            success: boolean;
        };
        AccountCashTransferResponse: {
            data: {
                created: boolean;
                destinationOperationId: string;
                destinationReplay: components["schemas"]["DraftCashReplay"];
                sourceOperationId: string;
                sourceReplay: components["schemas"]["DraftCashReplay"];
            };
            success: boolean;
        };
        AccountFxConversionInput: {
            /** Format: date */
            effectiveDate: string;
            /** @description Explicit fees aggregated per exchanged currency; empty list means no separately charged fee. Do not infer spread or a market rate. */
            fees: {
                /** @description Exact non-negative fee. */
                amount: string;
                currency: string;
            }[];
            from: {
                /** @description Exact positive amount exchanged before explicit fees. */
                amount: string;
                /** @description Supported ISO currency */
                currency: string;
            };
            idempotencyKey: string;
            sequence: number;
            sourceReference: string;
            to: {
                /** @description Exact positive gross amount received before explicit fees. */
                amount: string;
                currency: string;
            };
        };
        AccountFxConversionResponse: {
            data: {
                created: boolean;
                operationId: string;
                replay: components["schemas"]["DraftCashReplay"];
            };
            success: boolean;
        };
        AccountFxCorrectionInput: {
            expectedAuditNumber: number;
            expectedRevisionId: string;
            expectedSourceFingerprint: string;
            idempotencyKey: string;
            reason: string;
            replacement: components["schemas"]["FxRevisionReplacement"];
        };
        AccountFxCorrectionResponse: {
            data: {
                created: boolean;
                operationId: string;
                replay: components["schemas"]["DraftCashReplay"];
                revisionId: string;
            };
            success: boolean;
        };
        AccountIncomeReceiptResponse: {
            data: {
                created: boolean;
                operationId: string;
                replay: {
                    accountId: string;
                    activity: Record<string, never>[];
                    balances: Record<string, never>[];
                    funded: boolean;
                    fundingIssues: Record<string, never>[];
                    /** Format: date */
                    openingDate: string;
                };
            };
            success: boolean;
        };
        AccountReinvestmentInput: {
            acquisition: {
                /** Format: date */
                effectiveDate: string;
                /** @description Explicit fees paid from this net distribution in the same currency. */
                fees: string;
                /** @description Exact unit price; total consideration must fit existing cent-precision storage without rounding. */
                price: string;
                /** @description Exact positive units representable by the existing quantity storage. */
                quantity: string;
                sequence: number;
            };
            idempotencyKey: string;
            income: {
                assetId: string;
                currency: string;
                /** Format: date */
                entitlementDate: string;
                frankedAmount: string;
                frankingCreditAud: string;
                grossAmount: string;
                /** Format: date */
                paymentDate: string;
                sequence: number;
                sourceReference: string;
                unfrankedAmount: string;
                withholdingAmount: string;
            };
            /** @description Explicit non-negative cash paid into the account after acquisition and fees. */
            residualAmount: string;
            /** @enum {string} */
            residualDisposition: "ACCOUNT_CASH";
            /** @enum {boolean} */
            statementConfirmed: true;
        };
        AccountReinvestmentResponse: {
            data: {
                acquisitionOperationId: string;
                created: boolean;
                incomeOperationId: string;
                positionId: string;
                replay: components["schemas"]["DraftCashReplay"];
            };
            success: boolean;
        };
        AccountTradeResponse: {
            data: {
                created: boolean;
                operationId: string;
                replay: {
                    accountId: string;
                    activity: Record<string, never>[];
                    balances: Record<string, never>[];
                    funded: boolean;
                    fundingIssues: Record<string, never>[];
                    /** Format: date */
                    openingDate: string;
                };
                transactionId: string;
            };
            success: boolean;
        };
        DraftCashReplay: {
            accountId: string;
            activity: {
                changes: {
                    amount: string;
                    balanceAfter: string;
                    currency: string;
                }[];
                /** Format: date */
                effectiveDate: string;
                idempotencyKey: string;
                kind: string;
                sequence: number;
            }[];
            balances: {
                currency: string;
                endingAmount: string;
                minimumAmount: string;
                /** @description Includes transfer principal for this account */
                netExternalContribution: string;
                openingAmount: string;
            }[];
            funded: boolean;
            fundingIssues: {
                balance: string;
                currency: string;
                /** Format: date */
                effectiveDate: string;
                idempotencyKey: string;
                sequence: number;
            }[];
            /** Format: date */
            openingDate: string;
        };
        Error: {
            /** @description Detailed validation errors */
            details?: Record<string, never>[];
            /** @description Stable error category */
            error?: string;
            /** @description Human-readable error detail */
            message?: string;
        };
        FxRevisionReplacement: {
            /** Format: date */
            effectiveDate: string;
            fees: {
                /** @description Exact non-negative fee in either fixed exchanged currency. */
                amount: string;
                currency: string;
            }[];
            /** @description Exact positive exchanged amount before fees. */
            fromAmount: string;
            sequence: number;
            /** @description Exact positive received amount before fees. */
            toAmount: string;
        } | null;
        LiveCashTransferReview: {
            currency: string;
            current: components["schemas"]["TransferReplacement"];
            destinationAccountId: string;
            destinationHead: components["schemas"]["TransferRevisionHead"];
            destinationOperationId: string;
            sourceAccountId: string;
            sourceHead: components["schemas"]["TransferRevisionHead"];
            sourceOperationId: string;
            sourceReference: string;
        };
        LiveExecutionCorrectionResponse: {
            data: {
                created: boolean;
                operationId: string;
                replay: {
                    accountId: string;
                    activity: Record<string, never>[];
                    balances: Record<string, never>[];
                    funded: boolean;
                    fundingIssues: Record<string, never>[];
                    /** Format: date */
                    openingDate: string;
                };
                revisionId: string;
            };
            success: boolean;
        };
        LiveFxConversionReview: {
            accountId: string;
            auditNumber: number;
            current: components["schemas"]["FxRevisionReplacement"];
            expectedRevisionId: string;
            fromCurrency: string;
            operationId: string;
            sourceFingerprint: string;
            sourceReference: string;
            toCurrency: string;
        };
        LiveReinvestmentReview: {
            accountId: string;
            acquisitionOperationId: string;
            current: components["schemas"]["ReinvestmentCorrectionInput"]["replacement"];
            expectedAcquisitionRevisionId: string;
            expectedAuditNumber: number;
            expectedIncomeRevisionId: string;
            expectedSourceFingerprint: string;
            hasEffectiveSales: boolean;
            incomeOperationId: string;
            positionId: string;
        };
        OpeningConfirmationResult: {
            accountId: string;
            confirmationAudit: {
                [key: string]: unknown;
            } | null;
            /** Format: date-time */
            confirmedAt: string | null;
            confirmedByUserId: string | null;
            /** @description False for an identical idempotent retry. */
            created: boolean;
            /** @enum {string} */
            ledgerState: "ACTIVE";
            /** Format: date */
            openingDate: string;
            statementId: string;
        };
        OpeningStatement: {
            accountId: string;
            cashBalances: {
                /** @description Explicit opening cash as a decimal string. */
                amount: string;
                currency: string;
            }[];
            confirmation: {
                audit: {
                    [key: string]: unknown;
                } | null;
                /** Format: date-time */
                confirmedAt: string | null;
                confirmedByUserId: string | null;
            } | null;
            /** Format: date-time */
            createdAt: string;
            /** @description Inactive operations retained on this statement; any non-zero count blocks confirmation. */
            draftOperationCount: number;
            id: string;
            /** Format: date */
            openingDate: string;
            parcelCount: number;
            sourceFingerprint: string;
            /**
             * @description DRAFT is inactive; CONFIRMED is linked atomically to the account's active cash ledger.
             * @enum {string}
             */
            state: "DRAFT" | "CONFIRMED";
            /** @enum {string} */
            timezone: "Australia/Sydney";
            version: number;
        };
        ReinvestmentCorrectionInput: {
            expectedAcquisitionRevisionId: string;
            expectedAuditNumber: number;
            expectedIncomeRevisionId: string;
            expectedSourceFingerprint: string;
            idempotencyKey: string;
            reason: string;
            replacement: {
                acquisition: components["schemas"]["AccountReinvestmentInput"]["acquisition"];
                income: components["schemas"]["AccountReinvestmentInput"]["income"];
                residualAmount: string;
                /** @enum {string} */
                residualDisposition: "ACCOUNT_CASH";
                /** @enum {boolean} */
                statementConfirmed: true;
            } | null;
        };
        ReinvestmentCorrectionResponse: {
            data: {
                acquisitionOperationId: string;
                acquisitionRevisionId: string;
                created: boolean;
                incomeOperationId: string;
                incomeRevisionId: string;
                replay: components["schemas"]["DraftCashReplay"];
            };
            success: boolean;
        };
        TransferReplacement: {
            /** @description Exact positive same-currency principal. */
            amount: string;
            destinationSequence: number;
            /** Format: date */
            effectiveDate: string;
            /** @description Exact non-negative sender-paid fee. */
            fee: string;
            sourceSequence: number;
        } | null;
        TransferRevisionHead: {
            auditNumber: number;
            revisionId: string;
            sourceFingerprint: string;
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
