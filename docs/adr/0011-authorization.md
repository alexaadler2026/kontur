# 0011. Authorization: deny by default, roles plus ownership checks as pure policy functions

- Status: Accepted
- Date: 2026-11-15

## Context and Problem Statement

Authentication (ADR-0010) says who the caller is. Authorization decides what they may see
and do. The rules come from `business-processes.md` and the owner's answers:

**SignFlow** (one organisation per installation in v1)

- A user sees their own documents and documents where they are a signer or reviewer.
- An administrator manages users and invitations **but does not see other people's
  documents**.

**Belegscan**

- A user can be a member of several groups; any user can create a group.
- Roles per group: member, accountant. All members see the group's receipts.
- An accountant can edit and confirm. A confirmed receipt can be edited only by an
  accountant. An accountant may confirm their own receipts (noted in the history).

The typical failure in this area is not a missing role check but a missing **ownership**
check: user A reads document 17 of user B by changing an id in the URL.

All endpoints shown are **illustrative examples, not the final API**.

## Decision Drivers

- A forgotten check must fail closed (no access), and CI should notice it.
- Rules must be readable in one place and testable without HTTP or a database.
- No rule engine for a handful of rules.
- Belegscan's group membership must scope every query.

## Considered Options

1. **Deny-by-default guard + policy functions per resource + scoped queries**
2. Role decorators only (`@Roles('admin')`) on controllers
3. A permission library (CASL) with ability definitions
4. PostgreSQL row-level security

## Decision Outcome

Chosen option: **1**.

### Mechanism

- **Deny by default.** A global guard rejects every request unless the route declares a
  policy (`@Policy(...)`) or is explicitly marked `@Public()`. A test walks all registered
  routes and fails if one has neither.
- **Policy functions.** For each resource type a small module of pure functions:
  `canReadEnvelope(principal, envelope)`, `canEditReceipt(principal, membership, receipt)`.
  No framework, no I/O: input is the caller and the loaded resource, output is yes/no.
  They are unit-tested as a table (role × state × action).
- **Scoped queries.** List endpoints never load "all rows and filter later". The
  repository takes the principal and builds the `where` clause from it
  (`ownerId = me OR participant.email = myVerifiedEmail`; `groupId IN myGroups`).
- **404 instead of 403** when the caller is not allowed to know the resource exists.
  403 is used only when the resource is visible but the action is not allowed
  (e.g. a member editing a confirmed receipt).
- **Principals.** A request is made by one of two kinds of principal: an `account`
  (session cookie, ADR-0010) or a `participant` (external signer/reviewer, scoped to one
  envelope; decided in wave 2). Policies receive the principal and must handle both kinds
  explicitly — there is no way to "forget" that participants exist.

### SignFlow rules (v1)

| Action                                                  | Owner (sender) | Signer / reviewer of this envelope | Administrator | Anyone else |
| ------------------------------------------------------- | -------------- | ---------------------------------- | ------------- | ----------- |
| Read envelope, protocol, PDF                            | yes            | yes                                | no            | no (404)    |
| Edit draft, send, remind, void, extend, delete, archive | yes            | no                                 | no            | no          |
| Sign / decline own fields, review                       | if also signer | yes                                | no            | no          |
| Manage users and invitations                            | no             | no                                 | yes           | no          |
| Installation settings (retention)                       | no             | no                                 | yes           | no          |

- "Administrator" is a flag on a normal user. An administrator who is also an owner or
  signer has those rights through that relation, not through the flag.
- A signer or reviewer with an account is matched by **verified e-mail** (ADR-0010) and
  finds the envelope in the inbox.

### Belegscan rules (v1)

- Table `memberships (userId, groupId, role)`; role ∈ `member`, `accountant`.
- Group-scoped routes carry the group in the path (illustrative:
  `/api/v1/groups/{groupId}/receipts`). The guard loads the membership once; no membership
  → 404.

| Action                              | Member                            | Accountant                                       |
| ----------------------------------- | --------------------------------- | ------------------------------------------------ |
| See all receipts of the group       | yes                               | yes                                              |
| Create; edit an unconfirmed receipt | yes                               | yes                                              |
| Confirm                             | no                                | yes (own receipts too — recorded in the history) |
| Edit a confirmed receipt            | no (403)                          | yes (recorded in the history)                    |
| Move to trash                       | **own** unconfirmed receipts only | any receipt                                      |

**Group owner.** The user who creates a group is its owner — a flag on the membership,
independent of the role (an owner can be a member or an accountant). Only the owner
invites and removes members and assigns the accountant role.

**Invitation into a group may create an account.** If the invited e-mail has no Belegscan
account, accepting the invitation creates one (the invitation flow of ADR-0010). This is
what "registration by invitation only" means in Belegscan; the very first user is created
by the server command.

### What this does not protect against

The server administrator (operating-system level) is outside this model and can
technically read everything (ADR-0012). Authorization governs application users.

### Consequences

- Good: a new endpoint without a policy does not start serving data — the guard and the
  route test stop it.
- Good: rules are plain functions; the test table reads like the business rules above.
- Good: scoped queries make "change the id in the URL" return 404.
- Bad: every policy needs the resource loaded first (one query before the action).
- Bad: rules live in code, not in a configuration UI — fine for v1; the v2 "approval
  routes" will need a data-driven model and a new ADR.

## Pros and Cons of the Options

### Deny-by-default + policy functions + scoped queries

- Good: fails closed; testable; no dependency; covers ownership, not only roles.
- Bad: discipline needed to route every data access through the scoped repository
  (supported by the route test and code review).

### Role decorators only

- Good: the NestJS tutorial approach; very little code.
- Bad: roles say nothing about _which_ document — exactly the ownership hole. "Admin sees
  no documents" cannot be expressed.

### CASL

- Good: declarative abilities, can share rules with the frontend.
- Bad: another concept and dependency for about a dozen rules; conditions on related data
  (membership, participant e-mail) still need custom code.

### PostgreSQL row-level security

- Good: enforced by the database even if the application forgets.
- Bad: needs the user identity set on every connection (awkward with Prisma's pool);
  policies in SQL are harder to test and explain; overkill for this scale.
