NOTE: This document was written before the implementation of implementation-plan-EnhancedExpenseManagement.mdc

If we later build an implementation plan around this product doc 

## Product Document: Advanced LLM-Powered Group Expense Ledger

### 1. Introduction

This document outlines the requirements for an advanced LLM-powered group expense management system. The application currently supports:

1.  **AI-driven creation of new expenses:** Users can describe expenses in natural language (`NLLExpenseInput.tsx` calling `parse-expense` Edge Function). The LLM can parse this into one or more structured `ParsedExpense` objects, including basic itemization. These are then saved individually by the user, one by one.
2.  **Manual creation of new expenses:** Users can manually create detailed expenses, *including itemization*, via `ManualExpenseForm.tsx`.
3.  **Viewing expenses:** A list of confirmed expenses and their financial impact can be viewed (`GroupLedgerView.tsx`, `ExpenseListItem.tsx`).
4.  **Manual editing of expenses:** Existing expenses can be manually edited via `ExpenseEditForm.tsx`. **Crucially, this form currently does *not* support the editing of itemized details.**
5.  **Manual deletion of expenses:** Expenses can be deleted via functionality in `ExpenseListItem.tsx`.

**The Core Goal & Current Deficiencies:**

The primary goal is to enable users to **generate a comprehensive Ledger of expenses from natural language and then iteratively modify and add to this Ledger using further natural language commands in a fluid, conversational manner.**

The current implementation has significant deficiencies in achieving this:

*   **Deficiency 1: No AI-Driven Ledger Modification:** The existing AI functionality (`parse-expense`) is stateless regarding any existing ledger. It can only create new expenses from raw text and cannot process instructions to modify or delete specific, existing expenses within the context of a loaded ledger.
*   **Deficiency 2: Critical Gap in Manual Itemization Editing:** While the LLM can create itemized expenses, and users can manually create them, the primary manual *editing* form (`ExpenseEditForm.tsx`) lacks the capability to modify these itemized details. This makes correcting LLM-generated itemization errors (or any user-created itemization) extremely cumbersome, often requiring deletion and full re-entry.
*   **Deficiency 3: Disconnected User Flows & Clunky UX for Multiple Expenses:** The processes for AI creation (requiring individual saves for multiple parsed expenses), ledger viewing, and manual editing are not integrated into a seamless, conversational ledger management experience.

This document details the new architecture and functionality required to build a true "ledger-aware" AI interaction model, with a strong emphasis on enabling modifications that are currently difficult or impossible, such as changes to itemized expenses.

### 2. The "Ledger" Concept

*   **Definition:** The "Ledger" is the complete, stateful list of all confirmed expense transactions for a specific group, loaded from the database.
*   **Data Structure:** The Ledger is an array of `Expense` objects. The structure of an individual `Expense` object is as defined in the database (`types/database.ts` - specifically the `Expense` type - and `supabase/migrations/...`) and largely aligns with the `ParsedExpense` interface in `NLLExpenseInput.tsx` and the schema in `ManualExpenseForm.tsx`. Key fields include:

    ```json
    {
      "id": "string (unique, persistent, from database - e.g., expense.id)", // CRUCIAL for updates
      "group_id": "string",
      "description": "string",
      "total_amount": "number (decimal)",
      "currency": "string (e.g., 'USD')",
      "date_of_expense": "string (date ISO format)",
      "payers": [
        { "user_id": "string", "placeholder_name": "string", "amount": "number" }
      ],
      "participants": [
        { "user_id": "string", "placeholder_name": "string", "amount": "number", "percentage": "number" }
      ],
      "items": [ // Optional for itemization
        {
          "id": "string (unique ID for this item, e.g., UUID generated on creation)",
          "description": "string",
          "amount": "number",
          "participants": [
            { "user_id": "string", "placeholder_name": "string", "amount": "number" }
          ]
        }
      ],
      "llm_assumptions": ["string"],
      "llm_confidence_score": "number (0.0-1.0)",
      "status": "string ('pending_confirmation', 'confirmed', 'edited')",
      "created_at": "string (timestamp)",
      "created_by": "string (user_id)"
      // ... other relevant fields from the database 'expenses' table
    }
    ```
    Each `Expense` object within the ledger *must* have its persistent database `id`. Similarly, each item within an `items` array should have its own persistent unique `id` (generated upon item creation). These IDs are vital for targeting updates.

*   **State:** The Ledger represents the current, confirmed state of all expenses. All AI-driven natural language modifications will operate on this loaded state.

### 3. Proposed Technical Architecture for Iterative Ledger Modification

A new LLM interaction flow, managed by a **new Supabase Edge Function (e.g., `update-ledger`)**, is required. This is distinct from the existing `parse-expense` flow.

#### 4.1. New LLM Interaction Flow: "Ledger Update"

This flow is triggered when a user, while viewing the group's expense ledger, provides a natural language command intended to modify it.

**Inputs to the LLM (`update-ledger` function):**

1.  **Current Full Ledger Data:**
    *   The complete array of current `Expense` objects for the group (as defined above, including their database `id`s and item `id`s), serialized as JSON.
2.  **User's Natural Language Instruction:**
    *   The new text from the user.
3.  **Group Member Information:**
    *   A list of current group members (names, `user_id`s/`group_member_id`s, placeholder status).

**LLM's Task during Ledger Update:**

The LLM must interpret the user's instruction as operations (Create, Update, Delete) on the *provided current ledger*. It must:

1.  **Identify Target Expense(s) and/or Item(s):** If the instruction refers to existing expenses or items within expenses, the LLM must determine which `id`(s) (expense `id` and/or item `id`) from the provided ledger are being targeted.
2.  **Determine Operation Type:** Discern if the user wants to UPDATE, CREATE, or DELETE expenses or items within expenses.
3.  **Extract Details for the Operation:** Parse all relevant data for the operation.
4.  **Handle Itemization:** Be explicitly capable of understanding and generating modifications for the `items` array within an expense, including adding new items, updating existing items (their description, amount, participants), or deleting items. This is critical given the manual editing gap.

**Output from the LLM (`update-ledger` function - Strongly Prefer Option A):**

**Option A: List of Change Operations (Strongly Preferred)**

```json
{
  "operations": [
    {
      "operation": "UPDATE_EXPENSE", // or "CREATE_EXPENSE", "DELETE_EXPENSE", "UPDATE_ITEM", "CREATE_ITEM", "DELETE_ITEM"
      "expense_id": "database_expense_id_123", // Target expense 'id' for all operations
      "item_id": "database_item_id_abc", // Target item 'id' for item-specific operations; null if not item-specific
      "expense_data_patch": { /* For UPDATE_EXPENSE: only expense-level fields that changed */ },
      "item_data_patch": { /* For UPDATE_ITEM: only item-level fields that changed */ },
      "new_expense_data": { /* ... full new expense object for CREATE_EXPENSE ... */ },
      "new_item_data": { /* ... full new item object for CREATE_ITEM (associated with expense_id) ... */ },
      "reasoning": "string (LLM's explanation of this specific change)"
    }
    // ... more operations if the NL command resulted in multiple changes
  ],
  "overall_llm_assumptions": ["string (assumptions made for the whole update request)"],
  "clarifying_questions": ["string (if LLM needs more info to proceed confidently)"],
  "status": "success_with_changes" // or "needs_clarification", "error"
}
```
*   *Note the more granular operation types for clarity, especially for items. `expense_id` must be present for all operations. `item_id` is only for item-level operations.*

**Option B: The Entire Updated Ledger** (Less preferred due to risks outlined previously, but an alternative).

#### 4.2. Prompt Engineering for `update-ledger`

The system prompt for the `update-ledger` LLM interaction is critical. It must clearly instruct the LLM on its task, including:

*   "You will be provided with a JSON array representing the current expense ledger for a group, and a user's natural language request to modify this ledger. Each expense in the ledger has a unique `id`. Each item within an expense's `items` array also has a unique `id`."
*   "Your task is to interpret the user's request and generate a list of operations (e.g., `CREATE_EXPENSE`, `UPDATE_EXPENSE`, `DELETE_EXPENSE`, `CREATE_ITEM`, `UPDATE_ITEM`, `DELETE_ITEM`) to apply to the ledger."
*   "For `UPDATE_EXPENSE` or `DELETE_EXPENSE`, identify the `id` of the expense to change/delete. For `UPDATE_EXPENSE`, provide only the expense-level fields that need to be updated in `expense_data_patch`."
*   "For item-specific operations (`CREATE_ITEM`, `UPDATE_ITEM`, `DELETE_ITEM`), you must provide the parent `expense_id` and, for `UPDATE_ITEM` or `DELETE_ITEM`, the specific `item_id` of the item to be modified/deleted. For `CREATE_ITEM`, provide the full `new_item_data`. For `UPDATE_ITEM`, provide only changed fields in `item_data_patch`."
*   "When identifying expenses or items to modify, use the provided `id`s. If the user refers to an expense/item by description, payer, or other details, try your best to match it to an existing `id`. If ambiguous, ask a clarifying question."
*   "For `CREATE_EXPENSE` operations, generate a new `Expense` object in `new_expense_data`. Do not assign an `id`; the system will do that for the expense. If items are included, do not assign `id`s to them either."
*   "For `CREATE_ITEM` operations, generate the new item data in `new_item_data`. The system will assign the item `id`."
*   "Ensure all amounts are handled as numbers, ideally representing cents or using decimal-safe representations if possible in the LLM output context, though final precision handling is systemic."
*   "Provide your reasoning for each operation."
*   "If the user's request is unclear or you need more information to confidently identify an expense or apply a change, return clarifying questions instead of making risky assumptions."
*   Detailed instructions on the exact JSON output format for operations (as per 4.1 Option A).
*   Examples of input ledger, user instruction, and desired output operations, covering updates to top-level expense fields AND item-level fields.

#### 4.3. Backend Logic (`update-ledger` Edge Function)

This **new** Supabase Edge Function will:

1.  **Receive Input:** Current serialized ledger (fetched from the database by the client and passed up), the user's NL instruction, and group member info from the client.
2.  **Format Prompt & Call LLM.**
3.  **Process LLM Response (Change Operations):**
    *   Validate the operations (e.g., check `expense_id` existence for updates/deletes, ensure data types are correct).
    *   For each operation, interact with the database (ideally within a single transaction for all operations from one LLM response):
        *   **CREATE_EXPENSE:** Insert a new record into the `expenses` table. If `new_expense_data` includes `items`, ensure these items are also processed and assigned unique `id`s by the system (e.g., UUIDs) before saving the `items` array within the new expense.
        *   **UPDATE_EXPENSE:** Fetch the existing expense record by `expense_id` and apply the `expense_data_patch` to its top-level fields.
        *   **DELETE_EXPENSE:** Delete the record by `expense_id`.
        *   **CREATE_ITEM:** Fetch parent expense by `expense_id`. Generate a new unique `id` (e.g., UUID) for the item described in `new_item_data`, add this `id` to the item data, and then append this new item object to the expense's `items` JSONB array. Update the parent expense record.
        *   **UPDATE_ITEM:** Fetch parent expense by `expense_id`. Find the item within its `items` array that has the matching `item_id`. Apply the `item_data_patch` to this specific item object. Update the parent expense record.
        *   **DELETE_ITEM:** Fetch parent expense by `expense_id`. Remove the item object that has the matching `item_id` from its `items` array. Update the parent expense record.
4.  **Return Result to Client:** Send back the outcome (success, needs clarification, error) and any data needed for UI update (e.g., the changes made, or the new ledger state if fetching post-update).

#### 4.4. UI/UX for Ledger Modification

1.  **Integrated View:** The UI should ideally allow users to view the ledger (e.g., via an enhanced `GroupLedgerView` or a new dedicated component) and have a natural language input field readily available in the same context.
2.  **Displaying Changes:** After the LLM/backend processes an update:
    *   The ledger view must refresh to reflect the new state.
    *   **Crucially, the UI should clearly indicate what changes were made.** This could be through:
        *   Highlighting modified/new/deleted rows for expenses or items within an expense.
        *   Displaying a summary of the LLM's actions (e.g., using the `reasoning` field from the LLM's operation objects).
3.  **Confirmation/Undo:**
    *   For significant changes proposed by the LLM, a confirmation step might still be necessary.
    *   An "undo" option for the last set of LLM-driven changes would be a highly valuable feature for user confidence.
4.  **Item Modification Focus:** Given the current manual editing gap for items, the UI must pay special attention to clearly presenting proposed changes to itemization. If the LLM suggests changing an item's amount or participants, the UI needs to show that precisely and allow confirmation.
5.  **Handling Clarifying Questions:** If the LLM returns clarifying questions, the UI must present these to the user and allow them to respond, feeding the answer back into a subsequent `update-ledger` call (which would include the original NL instruction, the ledger, and the new clarifying answer).

### 5. Interaction Example: Ski-House Shuffle (Modification with Item Focus)

**Assumptions:** Initial ledger created (similar to previous draft's example), including `exp_skipass_02` (database `id`: `"exp_skipass_02"`) which was NOT itemized initially. User now wants to itemize it *and* add a new expense.

**A. Current Ledger State (simplified, passed to LLM):**
```json
[
  { "id": "exp_lodge_01", "description": "Lodge in Aspen", "total_amount": 2800, "items": [], /* ...other fields... */ },
  { "id": "exp_skipass_02", "description": "Ski passes", "total_amount": 3190, "items": [], "participants": [/* old non-itemized participant data */], /* ... */ },
  { "id": "exp_grocery_05", "description": "Groceries run #1", "total_amount": 340, "items": [], /* ... */ }
]
```

**B. User (Modification Instruction):**
"For the ski passes (ID exp_skipass_02), let's break it down: Alice's pass $330, Ben's pass $330. The rest of the $3190 was for the other 6 people. Also, add a hot-springs outing for $160, paid by Emma, for Dana, Emma, George, Hector."

**C. System (to LLM `update-ledger`):** Current ledger + User instruction + Group members.

**D. LLM (`update-ledger` response - Change Operations):**
```json
{
  "operations": [
    {
      "operation": "UPDATE_EXPENSE",
      "expense_id": "exp_skipass_02",
      "item_id": null,
      "expense_data_patch": {
        "participants": [] // Clear old participants as we are now itemizing fully
      },
      "reasoning": "Preparing ski pass expense (exp_skipass_02) for itemization by clearing its top-level participant split."
    },
    {
      "operation": "CREATE_ITEM",
      "expense_id": "exp_skipass_02",
      "item_id": null, // ID to be generated by system
      "new_item_data": {
        // "id" will be system-generated
        "description": "Alice's ski pass",
        "amount": 330,
        "participants": [{ "user_id": "alice_id", "amount": 330 }] // Assuming alice_id is known
      },
      "reasoning": "Added Alice's ski pass as an item to expense exp_skipass_02."
    },
    {
      "operation": "CREATE_ITEM",
      "expense_id": "exp_skipass_02",
      "item_id": null,
      "new_item_data": {
        "description": "Ben's ski pass",
        "amount": 330,
        "participants": [{ "user_id": "ben_id", "amount": 330 }] // Assuming ben_id is known
      },
      "reasoning": "Added Ben's ski pass as an item to expense exp_skipass_02."
    },
    {
      "operation": "CREATE_ITEM",
      "expense_id": "exp_skipass_02",
      "item_id": null,
      "new_item_data": {
        "description": "Remaining ski passes (6 people)",
        "amount": 2530, // 3190 - 330 - 330
        "participants": [ // Example split for remaining 6 people
          { "user_id": "carla_id", "amount": 421.67 },
          { "user_id": "dana_id", "amount": 421.66 }, // Adjusting for penny
          { "user_id": "emma_id", "amount": 421.67 },
          { "user_id": "george_id", "amount": 421.66 },
          { "user_id": "hector_id", "amount": 421.67 },
          { "user_id": "user_self_id", "amount": 421.67 }
        ]
      },
      "reasoning": "Added item for remaining ski passes to expense exp_skipass_02, split among the other 6 people."
    },
    {
      "operation": "CREATE_EXPENSE",
      "expense_id": null, // ID to be generated by system
      "item_id": null,
      "new_expense_data": {
        "description": "Hot-springs outing",
        "total_amount": 160,
        "currency": "USD",
        "date_of_expense": "YYYY-MM-DD", // LLM should infer or ask; system might default
        "payers": [{"user_id": "emma_id", "amount_paid": 160}],
        "participants": [
            {"user_id": "dana_id", "amount": 40}, {"user_id": "emma_id", "amount": 40},
            {"user_id": "george_id", "amount": 40}, {"user_id": "hector_id", "amount": 40}
        ],
        "items": [],
        "llm_assumptions": ["Split hot-springs evenly among specified participants."]
        // status will be set by system, e.g., 'pending_confirmation' or 'confirmed'
      },
      "reasoning": "Added new expense for hot-springs outing."
    }
  ],
  "overall_llm_assumptions": ["Assumed current date for new expenses if not specified."],
  "clarifying_questions": [],
  "status": "success_with_changes"
}
```

**E. System (Backend `update-ledger` function):**
1.  Receives operations.
2.  Starts a database transaction.
3.  Updates `exp_skipass_02` to clear its top-level `participants` array.
4.  For each `CREATE_ITEM` operation targeted at `exp_skipass_02`:
    *   Generates a new unique `id` for the item (e.g., `item_uuid_1`, `item_uuid_2`, `item_uuid_3`).
    *   Adds this item (with its new `id`) to the `items` JSONB array of the `exp_skipass_02` expense object.
    *   Updates the `exp_skipass_02` record in the database.
5.  For the `CREATE_EXPENSE` operation:
    *   Generates a new unique `id` for the "Hot-springs outing" expense (e.g., `exp_hotspring_06`).
    *   Inserts this new expense record into the database.
6.  Commits the transaction.
7.  UI refreshes, clearly showing the new itemized breakdown for ski passes (expense `exp_skipass_02` now has items) and the new hot-springs expense (`exp_hotspring_06`).

### 6. Considerations for the AI Coding Assistant

*   **Database `id` Integrity:** Emphasize the critical importance of using the correct database `id` for expenses and generating/using persistent unique `id`s for items within the JSONB `items` field for reliable updates.
*   **Itemization is Key:** The LLM logic and backend processing must robustly handle CRUD operations on itemized entries within an expense. This is a major improvement over current manual capabilities and directly addresses **Deficiency 2**.
*   **Disambiguation:** The LLM must be prompted to be cautious. If it cannot confidently map a user's textual reference to a specific expense `id` or item `id`, it *must* ask a clarifying question. The UI needs to support this Q&A loop.
*   **Transactionality:** All database changes resulting from one LLM response (which may contain multiple operations) must be atomic.
*   **Error Handling & Fallbacks:** Robust error handling for LLM API failures, timeouts, malformed responses, or failed database operations is essential.
*   **UI for Item Changes:** The UI needs to clearly render proposed changes to items within an expense, as this level of detail is not in the current `ExpenseEditForm`.
*   **Addressing Clunky UX (Deficiency 3):** While this document focuses on ledger modification, the `update-ledger` mechanism (especially `CREATE_EXPENSE` operations) could potentially be reused in the future to streamline the initial saving of multiple `ParsedExpense` objects from `NLLExpenseInput.tsx`, offering a single "Confirm and Save All Suggestions" path instead of individual saves. This is a secondary consideration after the core ledger modification functionality is built.

This revised understanding and the resulting product document should provide a much stronger foundation for the AI coding assistant to build the desired advanced ledger management features, directly addressing the significant existing gaps in the application. 