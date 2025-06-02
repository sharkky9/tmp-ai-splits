# Product Requirements Document: LLM-Powered Expense Logging and Splitting

## 1. Introduction/Overview

This document outlines the requirements for a new product aimed at simplifying group expense tracking and settlement. Current solutions, like Splitwise, are powerful but can involve complex and tedious manual data entry, especially for non-evenly split expenses or expenses shared among subsets of a group.

This product will leverage a Large Language Model (LLM) to allow users to describe expenses in natural language. The LLM will interpret these descriptions, extract relevant details (who paid, who owes, amounts, how to split), and translate them into structured data. This structured data will be presented to the user in an intuitive interface for confirmation or adjustment. The system will then aggregate all expenses within a group and calculate a simplified set of transactions to settle debts.

The primary goal is to drastically reduce the effort and complexity of logging shared expenses, making the process faster, more intuitive, and less error-prone for users, particularly for common scenarios like friends sharing costs on a trip.

## 2. Goals

* **G1: Simplify Expense Entry:** Enable users to add individual or multiple expenses using natural language prompts, minimizing manual data input.
* **G2: Accurate LLM Interpretation:** Ensure the LLM accurately extracts key expense details: payers, participants, amounts, and intended split methods from user input.
* **G3: Transparent Confirmation & Adjustment:** Provide a clear and easy-to-use interface for users to review the LLM's interpretation, view assumptions, and make any necessary corrections or manual additions.
* **G4: Flexible Group Management:** Allow users to create and manage multiple groups, add members (via email, with placeholders for names mentioned in prompts), and track expenses per group.
* **G5: Simplified Debt Settlement:** Calculate and display the simplest way for group members to settle up (i.e., minimum number of transactions).
* **G6: User-Friendly Experience:** Design for a broad audience, ensuring the application is intuitive and easy to navigate, even for users not familiar with LLMs or complex financial tools.
* **G7: Support for Complex Splits:** Natively handle common complex splitting scenarios through LLM interpretation and manual controls, including uneven splits, expenses shared by subgroups, multiple payers for one expense, and itemized expenses with different splits per item.

## 3. User Stories

* **US1: As a trip organizer (user), I want to type "Yesterday, I paid $120 for dinner for myself, Alice, and Bob. Charlie wasn't there," so that the expense is quickly logged with the correct participants and payer.**
* **US2: As a group member, I want the LLM to create placeholder members like "Jeff" or "Chris" when they are mentioned in an expense description, so I don't have to pre-configure every member before logging expenses.**
* **US3: As a user, I want to be able to review how the LLM interpreted my natural language input for an expense, including any assumptions it made, so I can confirm its accuracy or easily correct it.**
* **US4: As a user who is not highly tech-savvy, I want the interface for confirming or adjusting expenses to be straightforward and easy to understand.**
* **US5: As a roommate, I want to create a group for "Apartment Bills" and another for "Weekend Trip," so I can keep expenses organized separately.**
* **US6: As a user, I want to add members to my group by their email address, so they can potentially be notified or (in the future) integrate with payment systems.**
* **US7: As a group member, at the end of a trip, I want to see a clear summary of who owes whom and how much, calculated to involve the fewest possible payments, so we can settle up easily.**
* **US8: As a user, if the LLM is highly uncertain about my input (e.g., "Groceries for some of us"), I want it to ask me a clarifying question rather than making a wild guess.**
* **US9: As a user, I want to describe an expense like "Sarah paid $50 and I paid $30 for the $80 concert tickets for both of us and Tom," so the system correctly records multiple payers for a single expense and splits Tom's share.**
* **US10: As a user, I want to input "Groceries $100 paid by me. Apples $10 for me and Eve. Milk $5 for Adam. Rest split evenly among me, Eve, Adam," so the system itemizes the bill and splits each item according to my instructions.**
* **US11: As a user, if I make a mistake or the LLM misinterprets, I want to be able to manually edit or delete an expense, or add a new one using a traditional form.**
* **US12: As a user, I want all expenses to be assumed in USD without me having to specify the currency each time, for simplicity in the initial version.**

## 4. Functional Requirements

### FR1: User Account Management
* FR1.1: Users must be able to sign up and log in (details TBD, assume basic email/password or social login).
* FR1.2: User profiles shall store a Name (required) and Email (optional).

### FR2: Group Management
* FR2.1: Users must be able to create a new group with a unique name.
* FR2.2: Users must be able to add members to a group.
    * FR2.2.1: Members can be initially identified by a name (e.g., "Jeff"). The system shall create a placeholder for this member within the group.
    * FR2.2.2: Users should be able to later associate an email address with these placeholder members or existing members.
* FR2.3: Users must be able to view a list of their groups.
* FR2.4: Users must be able to view the members of a specific group.

### FR3: Expense Logging via LLM
* FR3.1: The system must provide an input field where users can describe expenses in natural English language.
* FR3.2: The LLM must parse the natural language input to identify:
    * FR3.2.1: Expense description(s).
    * FR3.2.2: Total amount(s) of the expense(s).
    * FR3.2.3: The member(s) who paid for the expense(s) (Payers).
        * FR3.2.3.1: Support for multiple payers for a single expense.
    * FR3.2.4: The group members who participated in or owe for the expense(s) (Participants).
    * FR3.2.5: The date of the expense (if specified, otherwise use entry date or ask).
    * FR3.2.6: How the expense(s) should be split (e.g., evenly, specific amounts, shares, percentages, itemized).
    * FR3.2.7: Details for itemized expenses, including item descriptions, amounts, and specific splits for each item if provided by the user.
* FR3.3: The LLM should attempt to identify existing group members (including placeholders) from the input. If new names are mentioned, it should create new placeholder members within the current group context.
* FR3.4: If the LLM is highly uncertain about interpreting a key aspect of the expense, it should be able to prompt the user with clarifying questions. Otherwise, it should make its best interpretation.
* FR3.5: The LLM's interpretation shall be translated into a structured format. Essential structured data for each expense should include:
    * `expense_id`: Unique identifier for the expense.
    * `group_id`: Identifier linking to the relevant group.
    * `description`: Text summary of the expense.
    * `original_input_text`: The raw natural language input for this expense.
    * `total_amount`: Decimal, total value of the expense.
    * `currency`: String, defaulting to "USD".
    * `date_of_expense`: Date.
    * `payers`: List of objects, each containing `member_id` (placeholder or actual user ID) and `amount_paid` (decimal).
    * `participants`: List of objects for overall expense split (if not itemized), each containing `member_id`, `share_type` (enum: 'even', 'exact_amount', 'percentage', 'shares'), `share_value`, `calculated_owed_amount`.
    * `items` (optional list for itemization): List of item objects, each with:
        * `item_description`: Text.
        * `item_amount`: Decimal.
        * `item_participants`: List of objects (similar to `participants` above but for this specific item), detailing how this item's cost is split.
    * `llm_assumptions`: List of brief, human-readable strings explaining any assumptions made by the LLM (e.g., "Assumed 'dinner yesterday' implies all current group members unless specified otherwise by participant names").
    * `status`: Enum (e.g., 'pending_confirmation', 'confirmed').

### FR4: Expense Confirmation and Adjustment Interface
* FR4.1: The system must display the LLM-interpreted expense details in a clear, structured format for user review.
    * FR4.1.1: This display should include the interpreted description, amount, payer(s), participants, split method, and any LLM assumptions.
    * FR4.1.2: For itemized expenses, the breakdown of items and their individual splits must be clearly shown.
* FR4.2: Users must be able to confirm the interpreted expense details if they are correct.
* FR4.3: Users must be able to edit any part of the interpreted expense details, including:
    * Description, amount, currency (though default is USD).
    * Payer(s) and amounts paid.
    * Participants and their respective shares/amounts owed.
    * Split method (e.g., change from even to custom amounts).
    * Itemization details.
* FR4.4: Users must be able to map placeholder members (e.g., "Jeff") to actual group members or provide their email addresses.
* FR4.5: Users must be able to discard an LLM-interpreted expense.

### FR5: Manual Expense Management
* FR5.1: Users must be able to manually add a new expense using a traditional form-based interface, similar to existing expense-splitting apps. This interface should allow for specifying all details covered in FR3.5.
* FR5.2: Users must be able to view a list of all expenses within a group.
* FR5.3: Users must be able to edit existing confirmed expenses.
* FR5.4: Users must be able to delete expenses.

### FR6: Expense Ledger and Settlement
* FR6.1: The system must display an aggregated ledger for each group, showing all confirmed expenses and how they are split.
* FR6.2: The system must calculate the net amount owed between each pair of members in the group.
* FR6.3: The system must calculate and display a simplified list of transactions to settle all debts within the group, minimizing the total number of payments. (e.g., "Alice pays Bob $25").
    * *Developer Note: Research and implement a standard debt simplification algorithm. The goal is to find the optimal (or near-optimal) set of payments.*
* FR6.4: Once users are ready to "Settle Up" (conceptually, for this version), the system should finalize the current state of debts. For V1, this means clearly presenting the "who owes whom how much" summary for offline settlement.

### FR7: Currency
* FR7.1: The system will default to and primarily support USD for all monetary values in the initial version. Currency symbols should be displayed.

## 5. Non-Goals (Out of Scope for V1)

* **NG1: Direct Payment Integration:** Integration with payment applications like Cash App for automatic settlement is out of scope for V1. Settlement is offline.
* **NG2: Recurring Expenses:** Automatic creation of recurring expenses (e.g., monthly rent) is not required.
* **NG3: Multi-Language LLM Input:** LLM input will only be supported in English for V1. The UI will be in English.
* **NG4: In-app Dispute Resolution:** Mechanisms for handling disputes between users about expenses are out of scope. This is expected to be handled socially.
* **NG5: Advanced User Permissions/Roles within Groups:** All group members have the same permissions for adding/editing expenses for now.
* **NG6: Budgeting Features:** Budgeting, spending categories beyond what the LLM infers for description, and financial analysis tools are out of scope.
* **NG7: Receipt Scanning/OCR:** Uploading and parsing receipts via OCR is out of scope.

## 6. Design Considerations (Optional)

* **DC1: Simplicity and Clarity:** The UI should be extremely simple, clean, and intuitive, especially the expense confirmation screen. Prioritize ease of understanding for non-technical users.
* **DC2: LLM Transparency:** Clearly indicate which information was derived by the LLM and provide easy access to any assumptions made by the LLM.
* **DC3: Mobile-First Responsive Design:** While not explicitly requested, assume the application should be responsive and usable on mobile devices, as trips are a key use case.
* **DC4: Visual Feedback:** Provide good visual feedback during LLM processing and when changes are saved.

## 7. Technical Considerations (Optional)

* **TC1: LLM Choice:** An appropriate LLM will need to be selected and integrated, capable of robust natural language understanding and information extraction for financial contexts. Fine-tuning might be necessary.
* **TC2: Scalability:** While V1 might target smaller groups, the architecture should consider future scalability.
* **TC3: Data Integrity:** Ensure accuracy in financial calculations and data storage. Floating-point precision issues should be handled carefully (e.g., use Decimal types for currency).
* **TC4: Debt Simplification Algorithm:** Research and implement an efficient algorithm for minimizing settlement transactions (e.g., based on graph theory).

## 8. Success Metrics

* **SM1: LLM Performance:**
    * **Correction Rate:** Percentage of LLM-parsed expenses that require manual editing by the user before confirmation. Target: <20% after initial tuning.
    * **Clarification Question Rate:** Frequency with which the LLM must ask clarifying questions. Lower is generally better if accuracy is maintained.
    * **User Feedback on Interpretation:** Collect qualitative feedback (e.g., a simple "Was this interpretation accurate?") on LLM-generated expense entries.
* **SM2: User Engagement & Adoption:**
    * **Task Completion Time (Expense Logging):** Average time taken to log a new expense using the LLM interface. Compare with manual input if complex manual entry is also built.
    * **Group Creation Rate:** Number of new groups created per user / per week.
    * **Active Users:** Daily Active Users (DAU) and Monthly Active Users (MAU).
    * **Expense Logging Frequency:** Average number of expenses logged per active group.
* **SM3: User Satisfaction:**
    * **Net Promoter Score (NPS) or Customer Satisfaction (CSAT) surveys:** To gauge overall user satisfaction with the product.
    * **Ease of Use Ratings:** Specific ratings for the LLM input feature and the settlement process.
* **SM4: Core Value Proposition:**
    * **Settlement Completion:** Percentage of groups that reach a "settled" state (even if offline).
    * **Qualitative Feedback:** User interviews and feedback focusing on perceived simplicity and time saved compared to other methods.

## 9. Open Questions

* OQ1: What level of detail is required for "LLM Assumptions" to be helpful without being overwhelming?
* OQ2: What is the specific strategy for handling ambiguous natural language that falls below a high confidence threshold but isn't uncertain enough to *require* a clarifying question? (e.g., LLM makes a choice but flags it as lower confidence).
* OQ3: How should users be onboarded to effectively use the natural language input feature?
* OQ4: What are the specific error handling messages and recovery paths when the LLM fails to process an input entirely?